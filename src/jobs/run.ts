// Command line for import jobs (docs/specs/data-pipeline.md):
//   npm run import -- <source>            fetch, stage, check and merge one source
//   npm run import -- <source> --dry-run  fetch and parse only; writes nothing
//   npm run import -- <source> --force    import even if the source looks unchanged
//   npm run import -- --due               every source whose refresh interval has
//                                         passed, then the freshness check
import { appendFileSync } from "node:fs";
import type pg from "pg";
import { breakerReason } from "./breaker.ts";
import { type JobEnv, parseJobEnv } from "./env.ts";
import { createPoliteFetcher, type Fetcher, RobotsDisallowedError, userAgentFor } from "./fetch/polite.ts";
import { databaseClient, finishRun, merge, pauseSource, type RecordKind, stageRecords, startRun } from "./load.ts";
import { readCosCertifications, readCosLicenses, readCosYouthPrograms } from "./sources/careeronestop.ts";
import { readEada } from "./sources/eada.ts";
import { readOnet } from "./sources/onet.ts";
import { readOnetCip } from "./sources/onet-cip.ts";
import { readOnetIp } from "./sources/onet-ip.ts";
import { OUTLOOK_DELAY_MS, readOnetOutlook } from "./sources/onet-outlook.ts";
import { readOfficialList } from "./sources/official-list.ts";
import { readOfficialPrograms } from "./sources/official-programs.ts";
import { readScorecard, SCORECARD_DELAY_MS } from "./sources/scorecard.ts";
import { readUsajobs } from "./sources/usajobs.ts";
import type { AdapterResult } from "./sources/types.ts";

const COS_DELAY_MS = 500;

/** Career codes for adapters that look up each career (ingest.career_codes()). */
async function careerCodes(db: pg.Client) {
  const { rows } = await db.query<{ code: string }>("select c as code from ingest.career_codes() c");
  return rows.map((r) => r.code);
}

type Adapter = {
  kind: RecordKind;
  read: (
    fetcher: Fetcher,
    previous: { etag: string | null; release: string | null },
    env: JobEnv,
    careers: string[],
  ) => Promise<AdapterResult<unknown>>;
  /** Looks something up for every career, so it gets the career codes from the database. */
  needsCareers?: true;
  /** Wait between requests to one host; official APIs follow their own documented limits. */
  minDelayMs?: number;
  /** Only for official keyed APIs whose host disallows crawlers (decision 0007). */
  skipRobots?: true;
};

// --due runs sources in order of id: onet first, since the crosswalk and
// outlook rows need their careers.
const ADAPTERS: Record<string, Adapter> = {
  onet: { kind: "occupation", read: (fetcher, previous) => readOnet(fetcher, previous) },
  onet_cip: { kind: "occupation_program", read: (fetcher) => readOnetCip(fetcher) },
  onet_ip: { kind: "interest_question", read: readOnetIp, minDelayMs: OUTLOOK_DELAY_MS },
  onet_outlook: { kind: "occupation_outlook", read: readOnetOutlook, minDelayMs: OUTLOOK_DELAY_MS },
  official_list: { kind: "scholarship", read: () => readOfficialList() },
  official_programs: { kind: "student_program", read: () => readOfficialPrograms() },
  scorecard: { kind: "institution", read: readScorecard, minDelayMs: SCORECARD_DELAY_MS },
  // data.usajobs.gov's robots.txt disallows all crawlers (checked 2026-09-29);
  // its Search API is the documented way in, with a key (docs/DATA_SOURCES.md).
  usajobs: { kind: "opportunity", read: (fetcher, previous, env) => readUsajobs(fetcher, previous, env), skipRobots: true },
  // CareerOneStop documents no rate limit; two requests a second is polite and
  // keeps a career-by-career run near 10 minutes.
  cos_youth_programs: { kind: "youth_program", read: readCosYouthPrograms, minDelayMs: COS_DELAY_MS },
  cos_licenses: { kind: "career_license", read: readCosLicenses, minDelayMs: COS_DELAY_MS, needsCareers: true },
  cos_certifications: { kind: "career_certification", read: readCosCertifications, minDelayMs: COS_DELAY_MS, needsCareers: true },
  // One 12 MB zip a year; the 5-minute fetch timeout covers its 2-minute download.
  eada: { kind: "college_athletics", read: (fetcher, previous) => readEada(fetcher, previous) },
};

function fetcherFor(adapter: Adapter, env: JobEnv) {
  return createPoliteFetcher({
    userAgent: userAgentFor(env.IMPORT_CONTACT),
    minDelayMs: adapter.minDelayMs,
    checkRobots: !adapter.skipRobots,
  });
}

/** Prints a line, and adds it to the GitHub Actions job summary when there is one. */
function report(line: string, isError = false) {
  (isError ? console.error : console.log)(line);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `- ${line}\n`);
}

async function importSource(db: pg.Client, env: JobEnv, source: string, force: boolean) {
  const adapter = ADAPTERS[source];
  if (!adapter) {
    report(`${source}: no adapter in src/jobs/run.ts`, true);
    return false;
  }

  const run = await startRun(db, source);
  if (run.refusedReason) {
    report(`${source}: refused. ${run.refusedReason}`, true);
    return false;
  }
  try {
    const previous = force
      ? { etag: null, release: null }
      : { etag: run.lastEtag, release: run.lastRelease };
    const careers = adapter.needsCareers ? await careerCodes(db) : [];
    const result = await adapter.read(fetcherFor(adapter, env), previous, env, careers);
    if (result.status === "unchanged") {
      await finishRun(db, run.runId, { status: "unchanged", release: result.release, etag: result.etag });
      report(`${source}: unchanged (release ${result.release})`);
      return true;
    }

    const valid = result.records.filter((r) => r.status === "valid").length;
    const rejected = result.records.length - valid;
    const counts = { seen: result.records.length, rejected, release: result.release, etag: result.etag };
    await stageRecords(db, run.runId, adapter.kind, result.records);

    const stop = breakerReason({ valid, rejected, lastValid: run.lastValid });
    if (stop) {
      await finishRun(db, run.runId, { status: "aborted", ...counts, error: stop });
      report(`${source}: aborted before merging. ${stop}`, true);
      return false;
    }

    const merged = await merge(db, adapter.kind, run.runId, result.release);
    await finishRun(db, run.runId, { status: "succeeded", ...counts, ...merged });
    report(
      `${source}${result.release ? ` ${result.release}` : ""}: ${counts.seen} seen, ${rejected} rejected, ` +
        `${merged.added} added, ${merged.changed} changed, ${merged.removed} removed`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof RobotsDisallowedError) await pauseSource(db, source, message);
    await finishRun(db, run.runId, { status: "failed", error: message });
    report(`${source}: failed. ${message}`, true);
    return false;
  }
}

async function dryRun(env: JobEnv, source: string, adapter: Adapter) {
  let careers: string[] = [];
  if (adapter.needsCareers) {
    // Read-only: a dry run only lists the careers; a few are enough to check the parser.
    const db = databaseClient(env.IMPORT_DATABASE_URL);
    await db.connect();
    careers = (await careerCodes(db).finally(() => db.end())).slice(0, 5);
  }
  const result = await adapter.read(fetcherFor(adapter, env), { etag: null, release: null }, env, careers);
  if (result.status === "unchanged") throw new Error("A dry run never sends an ETag");
  const valid = result.records.filter((r) => r.status === "valid");
  const rejected = result.records.filter((r) => r.status === "rejected");
  console.log(`${source} ${result.release ?? ""}: ${valid.length} valid, ${rejected.length} rejected`);
  for (const r of valid.slice(0, 5)) console.log("  ", JSON.stringify(r.value).slice(0, 160));
  for (const r of rejected.slice(0, 5)) console.log("  rejected", r.id, r.reason);
  const stop = breakerReason({ valid: valid.length, rejected: rejected.length, lastValid: null });
  console.log(`Would stop before merging: ${stop ?? "no"}`);
}

async function main(argv: string[]) {
  const due = argv.includes("--due");
  const force = argv.includes("--force");
  const source = argv.find((a) => !a.startsWith("--"));
  if (due === Boolean(source) || (source && !ADAPTERS[source])) {
    console.error(
      `Usage: npm run import -- <source> [--dry-run] [--force], or --due. ` +
        `Sources: ${Object.keys(ADAPTERS).join(", ")}`,
    );
    return 2;
  }

  const env = parseJobEnv(process.env);

  if (source && argv.includes("--dry-run")) {
    await dryRun(env, source, ADAPTERS[source]);
    return 0;
  }

  const db = databaseClient(env.IMPORT_DATABASE_URL);
  await db.connect();
  try {
    if (source) return (await importSource(db, env, source, force)) ? 0 : 1;

    const { rows: dueRows } = await db.query<{ id: string }>("select s as id from ingest.due_sources() s");
    if (dueRows.length === 0) report("No sources due.");
    let ok = true;
    for (const { id } of dueRows) ok = (await importSource(db, env, id, force)) && ok;

    // Freshness check: fail (so GitHub emails) if a source keeps failing.
    const { rows: stale } = await db.query<{ source_id: string; last_success_at: Date | null }>(
      "select source_id, last_success_at from ingest.stale_sources()",
    );
    for (const s of stale) {
      report(`${s.source_id}: stale, last success ${s.last_success_at?.toISOString() ?? "never"}`, true);
    }
    return ok && stale.length === 0 ? 0 : 1;
  } finally {
    await db.end();
  }
}

process.exitCode = await main(process.argv.slice(2));
