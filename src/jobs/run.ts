// Command line for import jobs (docs/specs/data-pipeline.md):
//   npm run import -- <source>            fetch, stage, check and merge one source
//   npm run import -- <source> --dry-run  fetch and parse only; writes nothing
//   npm run import -- <source> --force    import even if the source looks unchanged
import pg from "pg";
import { breakerReason } from "./breaker.ts";
import { parseJobEnv } from "./env.ts";
import { createPoliteFetcher, RobotsDisallowedError, userAgentFor } from "./fetch/polite.ts";
import { finishRun, merge, pauseSource, type RecordKind, stageRecords, startRun } from "./load.ts";
import { readOnet } from "./sources/onet.ts";
import type { AdapterResult } from "./sources/types.ts";

type Adapter = {
  kind: RecordKind;
  read: (
    fetcher: ReturnType<typeof createPoliteFetcher>,
    previous: { etag: string | null; release: string | null },
  ) => Promise<AdapterResult<unknown>>;
};

const ADAPTERS: Record<string, Adapter> = {
  onet: { kind: "occupation", read: readOnet },
};

async function main(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const source = argv.find((a) => !a.startsWith("--"));
  const adapter = source ? ADAPTERS[source] : undefined;
  if (!source || !adapter) {
    console.error(`Usage: npm run import -- <source> [--dry-run] [--force]. Sources: ${Object.keys(ADAPTERS).join(", ")}`);
    return 2;
  }

  const env = parseJobEnv(process.env);
  const fetcher = createPoliteFetcher({ userAgent: userAgentFor(env.IMPORT_CONTACT) });

  if (dryRun) {
    const result = await adapter.read(fetcher, { etag: null, release: null });
    if (result.status === "unchanged") throw new Error("A dry run never sends an ETag");
    const valid = result.records.filter((r) => r.status === "valid");
    const rejected = result.records.filter((r) => r.status === "rejected");
    console.log(`${source} ${result.release ?? ""}: ${valid.length} valid, ${rejected.length} rejected`);
    for (const r of valid.slice(0, 5)) console.log("  ", JSON.stringify(r.value).slice(0, 160));
    for (const r of rejected.slice(0, 5)) console.log("  rejected", r.id, r.reason);
    console.log(`Would stop before merging: ${breakerReason({ valid: valid.length, rejected: rejected.length, lastValid: null }) ?? "no"}`);
    return 0;
  }

  const db = new pg.Client({ connectionString: env.IMPORT_DATABASE_URL });
  await db.connect();
  try {
    const run = await startRun(db, source);
    if (run.refusedReason) {
      console.error(`${source}: refused. ${run.refusedReason}`);
      return 1;
    }
    try {
      const previous = force
        ? { etag: null, release: null }
        : { etag: run.lastEtag, release: run.lastRelease };
      const result = await adapter.read(fetcher, previous);
      if (result.status === "unchanged") {
        await finishRun(db, run.runId, { status: "unchanged", release: result.release, etag: result.etag });
        console.log(`${source}: unchanged (release ${result.release})`);
        return 0;
      }

      const valid = result.records.filter((r) => r.status === "valid").length;
      const rejected = result.records.length - valid;
      const counts = { seen: result.records.length, rejected, release: result.release, etag: result.etag };
      await stageRecords(db, run.runId, adapter.kind, result.records);

      const stop = breakerReason({ valid, rejected, lastValid: run.lastValid });
      if (stop) {
        await finishRun(db, run.runId, { status: "aborted", ...counts, error: stop });
        console.error(`${source}: aborted before merging. ${stop}`);
        return 1;
      }

      const merged = await merge(db, adapter.kind, run.runId, result.release);
      await finishRun(db, run.runId, { status: "succeeded", ...counts, ...merged });
      console.log(
        `${source} ${result.release ?? ""}: ${counts.seen} seen, ${rejected} rejected, ` +
          `${merged.added} added, ${merged.changed} changed, ${merged.removed} removed`,
      );
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof RobotsDisallowedError) await pauseSource(db, source, message);
      await finishRun(db, run.runId, { status: "failed", error: message });
      throw error;
    }
  } finally {
    await db.end();
  }
}

process.exitCode = await main(process.argv.slice(2));
