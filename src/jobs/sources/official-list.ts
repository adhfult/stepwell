// Stepwell's curated list of official state and federal scholarship and grant
// programs, kept as JSON files in data/scholarships/ (one per state, plus
// federal.json). Nothing is fetched: the files are reviewed in pull requests.
// Spec: docs/specs/scholarships.md.
import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import type { AdapterResult, StagedRecord } from "./types.ts";

const DATA_DIR = new URL("../../../data/scholarships/", import.meta.url);

const noDashes = (text: string) => !/[–—]/.test(text);

export const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/),
    title: z.string().trim().min(1).max(200),
    sponsor: z.string().trim().min(1).max(200),
    sponsor_type: z.enum(["federal", "state", "private"]),
    url: z.url({ protocol: /^https$/ }),
    award: z.object({
      min: z.number().int().positive().nullable(),
      max: z.number().int().positive().nullable(),
      text: z.string().trim().max(120).nullable(),
    }),
    deadline: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("date"), date: z.iso.date() }),
      z.object({ kind: z.literal("usually"), month_day: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) }),
      z.object({ kind: z.literal("rolling") }),
      z.object({ kind: z.literal("unknown") }),
    ]),
    stages: z.array(z.enum(["high_school", "college", "graduate", "adult"])).min(1),
    rules: z.object({
      state: z.string().regex(/^[A-Z]{2}$/).nullable(),
      min_gpa: z.number().min(0).max(5).nullable(),
      fields: z.array(z.string().regex(/^\d{2}$/)),
      citizenship: z.enum(["citizen", "citizen_or_eligible_noncitizen"]).nullable(),
      first_generation: z.boolean(),
      military_family: z.boolean(),
      needs_fafsa: z.boolean(),
      other: z.string().trim().min(1).max(420).nullable(),
    }),
    description: z.string().trim().min(1).max(500).refine(noDashes, "No em or en dashes (DESIGN.md)"),
    checked_at: z.iso.date(),
  })
  .refine((e) => e.award.min === null || e.award.max === null || e.award.min <= e.award.max, {
    message: "award.min is more than award.max",
    path: ["award"],
  })
  .refine((e) => (e.sponsor_type === "state") === (e.rules.state !== null), {
    message: "State programs need rules.state; federal and private ones must not have it",
    path: ["rules", "state"],
  });

export type Entry = z.infer<typeof entrySchema>;

/** The database row shape (flattened), as staged for ingest.merge_scholarships(). */
export function toRow(e: Entry) {
  return {
    id: e.id,
    title: e.title,
    sponsor: e.sponsor,
    sponsor_type: e.sponsor_type,
    url: e.url,
    award_min: e.award.min,
    award_max: e.award.max,
    award_text: e.award.text,
    deadline_kind: e.deadline.kind,
    deadline_date: e.deadline.kind === "date" ? e.deadline.date : null,
    deadline_month_day: e.deadline.kind === "usually" ? e.deadline.month_day : null,
    stages: e.stages,
    state: e.rules.state,
    min_gpa: e.rules.min_gpa,
    fields: e.rules.fields,
    citizenship: e.rules.citizenship,
    first_generation: e.rules.first_generation,
    military_family: e.rules.military_family,
    needs_fafsa: e.rules.needs_fafsa,
    other_requirements: e.rules.other,
    description: e.description,
    checked_at: e.checked_at,
  };
}

export type ScholarshipRow = ReturnType<typeof toRow>;

/**
 * One file's entries. The file name says what's inside: "federal.json" holds
 * federal programs with ids "us-...", "ca.json" California's with "ca-...".
 */
export function parseFile(fileName: string, raw: unknown): StagedRecord<ScholarshipRow>[] {
  const prefix = fileName === "federal.json" ? "us" : fileName === "private.json" ? "pv" : fileName.replace(/\.json$/, "");
  const kind = prefix === "us" ? "federal" : prefix === "pv" ? "private" : "state";
  if (!Array.isArray(raw)) throw new Error(`${fileName}: expected a JSON array`);
  return raw.map((item, i): StagedRecord<ScholarshipRow> => {
    const result = entrySchema.safeParse(item);
    const id = `${fileName} item ${i + 1}`;
    if (!result.success) {
      return { status: "rejected", id, reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), raw: item };
    }
    const e = result.data;
    const wrongPlace =
      !e.id.startsWith(`${prefix}-`) ? `id must start with "${prefix}-"` :
      e.sponsor_type !== kind ? `sponsor_type must be "${kind}" in ${fileName}` :
      kind === "state" && e.rules.state !== prefix.toUpperCase() ? `rules.state must be ${prefix.toUpperCase()}` :
      null;
    return wrongPlace
      ? { status: "rejected", id, reason: wrongPlace, raw: item }
      : { status: "valid", id: e.id, value: toRow(e) };
  });
}

export async function readOfficialList(dir: URL = DATA_DIR): Promise<AdapterResult<ScholarshipRow>> {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) throw new Error("No scholarship files in data/scholarships/");
  const records = files.flatMap((f) => parseFile(f, JSON.parse(readFileSync(new URL(f, dir), "utf8"))));
  const ids = records.filter((r) => r.status === "valid").map((r) => r.id);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) throw new Error(`Duplicate scholarship id ${duplicate}`);
  return { status: "fetched", release: null, etag: null, records };
}
