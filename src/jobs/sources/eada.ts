// Equity in Athletics Data Analysis (EADA), U.S. Department of Education,
// public domain. One zip a year (about 12 MB, about 2 minutes to download):
// instLevel.xlsx has one row per college, schools.xlsx one per college and
// sport. Spec: docs/specs/ncaa-athlete-path.md.
import { unzipSync } from "fflate";
import { readSheet } from "read-excel-file/node";
import { z } from "zod";
import { EADA_SPORTS } from "../../lib/athletes/sports.ts";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const API = "https://ope.ed.gov/athletics/api/dataFiles";
// 2,037 colleges in the 2024-25 file; far fewer means the file changed.
export const MIN_COLLEGES = 1_500;

const count = z.number().int().min(0).max(2000).nullable();
const collegeSchema = z.object({
  unitid: z.number().int().positive(),
  code: z.number().int().min(1).max(99),
  sports: z.array(z.object({ sport: z.string().regex(/^[a-z][a-z-]{1,29}$/), men: count, women: count })),
});
export type CollegeAthletics = z.infer<typeof collegeSchema>;

const fileListSchema = z.array(z.object({ FileName: z.string(), Year: z.number().int() }));

export const seasonOf = (year: number) => `${year - 1}-${String(year).slice(2)}`;

/** Column positions by header name; throws naming the sheet when one is missing. */
function columns<const T extends string>(header: unknown[], names: T[], sheet: string) {
  const at = Object.fromEntries(names.map((n) => [n, header.indexOf(n)])) as Record<T, number>;
  const missing = names.filter((n) => at[n] === -1);
  if (missing.length) throw new Error(`EADA ${sheet} header is missing ${missing.join(", ")}`);
  return at;
}

const num = (v: unknown) => (typeof v === "number" ? v : null);

export function parseEada(inst: unknown[][], schools: unknown[][], minRows = MIN_COLLEGES): StagedRecord<CollegeAthletics>[] {
  const i = columns(inst[0] ?? [], ["unitid", "ClassificationCode"], "instLevel");
  const s = columns(
    schools[0] ?? [],
    ["unitid", "Sports", "PARTIC_MEN", "PARTIC_WOMEN", "PARTIC_COED_MEN", "PARTIC_COED_WOMEN"],
    "schools",
  );

  // unitid -> slug -> counts. A combined row ("Swimming and Diving") counts toward its first sport only,
  // and only until a split row for that sport arrives; split rows of one sport keep the larger count.
  type Counts = { men: number | null; women: number | null; combined: boolean };
  const teams = new Map<unknown, Map<string, Counts>>();
  const max = (a: number | null | undefined, b: number | null) => (a == null ? b : b === null ? a : Math.max(a, b));
  for (const row of schools.slice(1)) {
    if (row[s.unitid] == null) continue; // blank row, e.g. at the end of the sheet
    const name = String(row[s.Sports] ?? "");
    const slugs = EADA_SPORTS[name];
    if (!slugs) throw new Error(`Unknown EADA sport "${name}"; add it to src/lib/athletes/sports.ts`);
    const men = num(row[s.PARTIC_MEN]) ?? num(row[s.PARTIC_COED_MEN]);
    const women = num(row[s.PARTIC_WOMEN]) ?? num(row[s.PARTIC_COED_WOMEN]);
    if (men === null && women === null) continue;
    const bySport = teams.get(row[s.unitid]) ?? new Map<string, Counts>();
    teams.set(row[s.unitid], bySport);
    const combined = slugs.length > 1;
    for (const slug of combined ? slugs.slice(0, 1) : slugs) {
      let had = bySport.get(slug);
      if (combined && had && !had.combined) continue;
      if (!combined && had?.combined) had = undefined;
      bySport.set(slug, { men: max(had?.men, men), women: max(had?.women, women), combined });
    }
  }

  const records = inst.slice(1).map((row, n): StagedRecord<CollegeAthletics> => {
    const sports = [...(teams.get(row[i.unitid])?.entries() ?? [])]
      .map(([sport, { men, women }]) => ({ sport, men, women }))
      .sort((a, b) => a.sport.localeCompare(b.sport));
    const result = collegeSchema.safeParse({ unitid: row[i.unitid], code: row[i.ClassificationCode], sports });
    return result.success
      ? { status: "valid", id: String(result.data.unitid), value: result.data }
      : { status: "rejected", id: `row ${n + 2}`, reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), raw: row };
  });

  const valid = records.filter((r) => r.status === "valid").length;
  if (valid < minRows) throw new Error(`EADA has only ${valid} usable colleges (expected at least ${minRows}); has the file changed?`);
  return records;
}

/** The newest year's file, skipped when it's the season already loaded. */
export async function readEada(
  fetcher: Fetcher,
  previous: { release: string | null },
): Promise<AdapterResult<CollegeAthletics>> {
  const list = await fetcher.get(`${API}/fileList`, { as: "text" });
  if (list.status !== 200 || !list.body) throw new Error(`EADA file list returned ${list.status}`);
  const newest = fileListSchema
    .parse(JSON.parse(list.body))
    .filter((f) => /^EADA_\d{4}-\d{4}\.zip$/.test(f.FileName))
    .sort((a, b) => b.Year - a.Year)[0];
  if (!newest) throw new Error("EADA file list has no yearly file");
  const release = seasonOf(newest.Year);
  if (previous.release === release) return { status: "unchanged", release, etag: null };

  const file = await fetcher.get(`${API}/file?fileName=${encodeURIComponent(newest.FileName)}`, { as: "bytes" });
  if (file.status !== 200 || !file.bytes) throw new Error(`EADA download returned ${file.status}`);
  const zip = unzipSync(new Uint8Array(file.bytes), { filter: (f) => /^(instLevel|schools)\.xlsx$/i.test(f.name) });
  const sheet = (name: string) => {
    const entry = Object.entries(zip).find(([path]) => path.toLowerCase() === name.toLowerCase());
    if (!entry) throw new Error(`EADA zip has no ${name}`);
    return readSheet(Buffer.from(entry[1]));
  };
  const [inst, schools] = await Promise.all([sheet("instLevel.xlsx"), sheet("schools.xlsx")]);
  return { status: "fetched", release, etag: null, records: parseEada(inst, schools) };
}
