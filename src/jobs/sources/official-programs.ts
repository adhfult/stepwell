// Stepwell's curated list of official summer programs, internships and research
// for students, kept as JSON files in data/programs/ (one per state, plus
// federal.json). Nothing is fetched: the files are reviewed in pull requests.
// Spec: docs/specs/programs.md.
import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import type { AdapterResult, StagedRecord } from "./types.ts";

const DATA_DIR = new URL("../../../data/programs/", import.meta.url);

const plain = (max: number) =>
  z.string().trim().min(1).max(max).refine((t) => !/[–—]/.test(t), "No em or en dashes (DESIGN.md)");

export const programSchema = z.object({
  id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/),
  title: plain(200),
  sponsor: plain(200),
  sponsor_type: z.enum(["federal", "state", "university"]),
  kind: z.enum(["summer_program", "internship", "research"]),
  url: z.url({ protocol: /^https$/ }),
  stages: z.array(z.enum(["middle_school", "high_school", "college", "adult"])).min(1),
  states: z.array(z.string().regex(/^[A-Z]{2}$/)),
  remote: z.boolean(),
  paid: z.boolean(),
  pay_text: plain(120).nullable(),
  deadline: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("date"), date: z.iso.date() }),
    z.object({ kind: z.literal("usually"), month_day: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) }),
    z.object({ kind: z.literal("rolling") }),
    z.object({ kind: z.literal("unknown") }),
  ]),
  who_text: plain(300).nullable(),
  description: plain(500),
  checked_at: z.iso.date(),
});

export type Program = z.infer<typeof programSchema>;

/** The database row shape (flattened deadline), as staged for ingest.merge_student_programs(). */
export function toRow({ deadline, ...p }: Program) {
  return {
    ...p,
    deadline_kind: deadline.kind,
    deadline_date: deadline.kind === "date" ? deadline.date : null,
    deadline_month_day: deadline.kind === "usually" ? deadline.month_day : null,
  };
}

export type ProgramRow = ReturnType<typeof toRow>;

/** One file's entries: "federal.json" holds ids "us-...", "ca.json" holds "ca-...". */
export function parseFile(fileName: string, raw: unknown): StagedRecord<ProgramRow>[] {
  const prefix = fileName === "federal.json" ? "us" : fileName.replace(/\.json$/, "");
  if (!Array.isArray(raw)) throw new Error(`${fileName}: expected a JSON array`);
  return raw.map((item, i): StagedRecord<ProgramRow> => {
    const result = programSchema.safeParse(item);
    const id = `${fileName} item ${i + 1}`;
    if (!result.success) {
      return { status: "rejected", id, reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), raw: item };
    }
    return result.data.id.startsWith(`${prefix}-`)
      ? { status: "valid", id: result.data.id, value: toRow(result.data) }
      : { status: "rejected", id, reason: `id must start with "${prefix}-"`, raw: item };
  });
}

export async function readOfficialPrograms(dir: URL = DATA_DIR): Promise<AdapterResult<ProgramRow>> {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) throw new Error("No program files in data/programs/");
  const records = files.flatMap((f) => parseFile(f, JSON.parse(readFileSync(new URL(f, dir), "utf8"))));
  const ids = records.filter((r) => r.status === "valid").map((r) => r.id);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) throw new Error(`Duplicate program id ${duplicate}`);
  return { status: "fetched", release: null, etag: null, records };
}
