// Talks to the database as the importer role, which can only call the
// ingest.* functions (decision 0008).
import type pg from "pg";
import type { StagedRecord } from "./sources/types.ts";

const BATCH_SIZE = 500;
const MAX_REJECTED_KEPT = 20; // Section 3.8: the first 20 rejected records per run

export type StartedRun = {
  runId: number;
  refusedReason: string | null;
  lastEtag: string | null;
  lastRelease: string | null;
  lastValid: number | null;
};

export async function startRun(db: pg.Client, source: string): Promise<StartedRun> {
  const { rows } = await db.query(
    "select run_id, refused_reason, last_etag, last_release, last_valid from ingest.start_run($1)",
    [source],
  );
  const row = rows[0];
  return {
    runId: Number(row.run_id),
    refusedReason: row.refused_reason,
    lastEtag: row.last_etag,
    lastRelease: row.last_release,
    lastValid: row.last_valid,
  };
}

export async function stageRecords<T>(
  db: pg.Client,
  runId: number,
  kind: string,
  records: StagedRecord<T>[],
) {
  const rejected = records.filter((r) => r.status === "rejected").slice(0, MAX_REJECTED_KEPT);
  const rows = [...records.filter((r) => r.status === "valid"), ...rejected].map((r) =>
    r.status === "valid"
      ? { kind, source_record_id: r.id, status: "valid", payload: r.value, reject_reason: null }
      : { kind, source_record_id: r.id, status: "rejected", payload: r.raw, reject_reason: r.reason },
  );
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.query("select ingest.stage_records($1, $2::jsonb)", [
      runId,
      JSON.stringify(rows.slice(i, i + BATCH_SIZE)),
    ]);
  }
}

// Merge functions by record kind. A fixed list, so no SQL is ever built from input.
const MERGE_SQL = {
  occupation: "select added, changed, removed from ingest.merge_occupations($1, $2)",
} as const;

export type RecordKind = keyof typeof MERGE_SQL;

export async function merge(db: pg.Client, kind: RecordKind, runId: number, release: string | null) {
  const { rows } = await db.query(MERGE_SQL[kind], [runId, release]);
  return rows[0] as { added: number; changed: number; removed: number };
}

export type RunSummary = {
  status: "succeeded" | "failed" | "aborted" | "unchanged";
  seen?: number;
  rejected?: number;
  added?: number;
  changed?: number;
  removed?: number;
  release?: string | null;
  etag?: string | null;
  error?: string | null;
};

export async function finishRun(db: pg.Client, runId: number, s: RunSummary) {
  await db.query("select ingest.finish_run($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", [
    runId,
    s.status,
    s.seen ?? 0,
    s.rejected ?? 0,
    s.added ?? 0,
    s.changed ?? 0,
    s.removed ?? 0,
    s.release ?? null,
    s.etag ?? null,
    s.error ?? null,
  ]);
}

export async function pauseSource(db: pg.Client, source: string, reason: string) {
  await db.query("select ingest.pause_source($1, $2)", [source, reason]);
}
