// O*NET Database (CC BY 4.0): the list of occupations, from the CSV download.
// Career Explorer adds more O*NET files to this adapter.
import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const DATABASE_PAGE = "https://www.onetcenter.org/database.html";
const CSV_LINK = /\/dl_files\/database\/db_(\d+)_(\d+)_csv\/occupation_data\.csv/g;

const occupationSchema = z.object({
  onet_code: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/, "O*NET code must look like 29-1141.00"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
});

export type Occupation = z.infer<typeof occupationSchema>;

/** The newest release linked from the database page, with its CSV URL. */
export function findLatestRelease(html: string): { release: string; csvUrl: string } {
  const found = [...html.matchAll(CSV_LINK)].map((m) => ({
    major: Number(m[1]),
    minor: Number(m[2]),
    path: m[0],
  }));
  if (found.length === 0) throw new Error("No occupation_data.csv link on the O*NET database page");
  found.sort((a, b) => b.major - a.major || b.minor - a.minor);
  const newest = found[0];
  return {
    release: `${newest.major}.${newest.minor}`,
    csvUrl: new URL(newest.path, DATABASE_PAGE).href,
  };
}

/** Turns the CSV into staged records: valid ones, and rejected ones with a reason. */
export function parseOccupations(csv: string): StagedRecord<Occupation>[] {
  const rows: Record<string, string>[] = parse(csv, { columns: true, skip_empty_lines: true });
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const result = occupationSchema.safeParse({
      onet_code: row["O*NET-SOC Code"],
      title: row["Title"],
      description: row["Description"],
    });
    const rowId = `row ${index + 2}`; // line number in the file, after the header
    if (!result.success) {
      const reason = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return { status: "rejected", id: rowId, reason, raw: row };
    }
    if (seen.has(result.data.onet_code)) {
      return { status: "rejected", id: rowId, reason: `Duplicate ${result.data.onet_code}`, raw: row };
    }
    seen.add(result.data.onet_code);
    return { status: "valid", id: result.data.onet_code, value: result.data };
  });
}

export async function readOnet(
  fetcher: Fetcher,
  previous: { etag: string | null; release: string | null },
): Promise<AdapterResult<Occupation>> {
  const page = await fetcher.get(DATABASE_PAGE);
  if (page.status !== 200) throw new Error(`O*NET database page returned ${page.status}`);
  const { release, csvUrl } = findLatestRelease(page.body);

  // The release number is O*NET's real version. Their ETags differ between
  // servers for the same file, so they can't tell us if it changed.
  if (release === previous.release) return { status: "unchanged", release, etag: previous.etag };
  const file = await fetcher.get(csvUrl);
  if (file.status !== 200) throw new Error(`${csvUrl} returned ${file.status}`);

  return { status: "fetched", release, etag: file.etag, records: parseOccupations(file.body) };
}
