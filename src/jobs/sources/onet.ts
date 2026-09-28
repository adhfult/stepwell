// O*NET Database (CC BY 4.0): careers and their details, from the CSV
// download of the current release (docs/specs/career-explorer.md).
import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const DATABASE_PAGE = "https://www.onetcenter.org/database.html";
const CSV_LINK = /\/dl_files\/database\/db_(\d+)_(\d+)_csv\/occupation_data\.csv/g;
const CODE = /^\d{2}-\d{4}\.\d{2}$/;
const MAX_TASKS = 8;
const MAX_SKILLS = 6;

type Row = Record<string, string>;

// The extra files, and the fewest usable rows each must have (about half of
// release 31.0's count). Fewer means O*NET changed the file: the run fails
// instead of quietly emptying every career page.
export const DETAIL_FILES = {
  job_titles: 25_000,
  sample_of_reported_titles: 4_000,
  job_zones: 450,
  education: 4_500,
  task_statements: 9_000,
  task_ratings: 9_000,
  essential_skills: 4_500,
  transferable_skills: 11_000,
  related_occupations: 9_000,
  career_interest_types: 2_700,
} as const;

export type DetailFile = keyof typeof DETAIL_FILES;

const INTEREST_AREAS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
type InterestColumn = `interest_${(typeof INTEREST_AREAS)[number]}`;
const interestScore = z.number().min(1).max(7).nullable();

const RELATED_TIERS: Record<string, "primary_short" | "primary_long" | "supplemental"> = {
  "Primary-Short": "primary_short",
  "Primary-Long": "primary_long",
  Supplemental: "supplemental",
};

const occupationSchema = z.object({
  onet_code: z.string().regex(CODE, "O*NET code must look like 29-1141.00"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  job_zone: z.number().int().min(1).max(5).nullable(),
  education_level: z.number().int().min(1).max(12).nullable(),
  education_share: z.number().int().min(0).max(100).nullable(),
  interest_realistic: interestScore,
  interest_investigative: interestScore,
  interest_artistic: interestScore,
  interest_social: interestScore,
  interest_enterprising: interestScore,
  interest_conventional: interestScore,
  tasks: z.array(z.string().min(1).max(1000)).max(MAX_TASKS),
  skills: z.array(z.string().min(1).max(100)).max(MAX_SKILLS),
  titles: z.array(
    z.object({
      kind: z.enum(["reported", "alternate"]),
      title: z.string().min(1).max(200),
      featured: z.boolean(),
    }),
  ),
  related: z.array(
    z.object({
      code: z.string().regex(CODE),
      tier: z.enum(["primary_short", "primary_long", "supplemental"]),
      rank: z.number().int().positive(),
    }),
  ),
});

export type Occupation = z.infer<typeof occupationSchema>;
export type Details = Omit<Occupation, "onet_code" | "title" | "description">;

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

function parseCsv(csv: string): Row[] {
  return parse(csv, { columns: true, skip_empty_lines: true });
}

/** Rows that have every named column filled, checked against the file's minimum. */
function usableRows(file: DetailFile, csv: string, columns: string[], minimums: Record<DetailFile, number>, keep: (row: Row) => boolean = () => true) {
  const rows = parseCsv(csv).filter((row) => columns.every((c) => row[c]) && keep(row));
  if (rows.length < minimums[file]) {
    throw new Error(`${file}.csv: only ${rows.length} usable rows (expected at least ${minimums[file]}); has the file changed?`);
  }
  return rows;
}

const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const notSuppressed = (row: Row) => row["Recommend Suppress"] !== "Y" && row["Not Relevant"] !== "Y";

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

const emptyDetails: Details = {
  job_zone: null,
  education_level: null,
  education_share: null,
  interest_realistic: null,
  interest_investigative: null,
  interest_artistic: null,
  interest_social: null,
  interest_enterprising: null,
  interest_conventional: null,
  tasks: [],
  skills: [],
  titles: [],
  related: [],
};

/** Joins the detail files into one Details object per O*NET code. */
export function buildDetails(files: Record<DetailFile, string>, minimums: Record<DetailFile, number> = DETAIL_FILES) {
  const details = new Map<string, Details>();
  const get = (code: string) => {
    let d = details.get(code);
    if (!d) {
      d = { ...emptyDetails, tasks: [], skills: [], titles: [], related: [] };
      details.set(code, d);
    }
    return d;
  };
  const CODE_COL = "O*NET-SOC Code";

  for (const row of usableRows("job_zones", files.job_zones, [CODE_COL, "Job Zone"], minimums)) {
    get(row[CODE_COL]).job_zone = Number(row["Job Zone"]);
  }

  // Typical education: the level the most workers reported ("RL" scale).
  // O*NET flags imprecise percentages ("Recommend Suppress"). Skipping them
  // would pick the wrong level (Registered Nurses: bachelor's 56% is flagged,
  // so a 23% certificate would win), so every level counts when choosing,
  // and a flagged share is simply not shown.
  const education = usableRows("education", files.education, [CODE_COL, "Category", "Data Value"], minimums,
    (row) => row["Scale ID"] === "RL");
  const topShare = new Map<string, number>();
  for (const row of education) {
    const code = row[CODE_COL];
    const value = Number(row["Data Value"]);
    if (value > (topShare.get(code) ?? -1)) {
      topShare.set(code, value);
      const d = get(code);
      d.education_level = Number(row["Category"]);
      d.education_share = row["Recommend Suppress"] === "Y" ? null : Math.round(value);
    }
  }

  // Top tasks: core tasks by importance ("IM" scale).
  const importance = new Map<string, number>();
  for (const row of usableRows("task_ratings", files.task_ratings, ["Task ID", "Data Value"], minimums,
    (row) => row["Scale ID"] === "IM" && notSuppressed(row))) {
    importance.set(row["Task ID"], Number(row["Data Value"]));
  }
  const tasks = new Map<string, { text: string; importance: number }[]>();
  for (const row of usableRows("task_statements", files.task_statements, [CODE_COL, "Task ID", "Task"], minimums,
    (row) => row["Task Type"] === "Core")) {
    push(tasks, row[CODE_COL], { text: clean(row["Task"]), importance: importance.get(row["Task ID"]) ?? 0 });
  }
  for (const [code, list] of tasks) {
    get(code).tasks = list
      .sort((a, b) => b.importance - a.importance)
      .slice(0, MAX_TASKS)
      .map((t) => t.text);
  }

  // Top skills: both of O*NET 31.0's skill files, by importance.
  const skills = new Map<string, { name: string; importance: number }[]>();
  for (const file of ["essential_skills", "transferable_skills"] as const) {
    for (const row of usableRows(file, files[file], [CODE_COL, "Element Name", "Data Value"], minimums,
      (row) => row["Scale ID"] === "IM" && notSuppressed(row))) {
      push(skills, row[CODE_COL], { name: clean(row["Element Name"]), importance: Number(row["Data Value"]) });
    }
  }
  for (const [code, list] of skills) {
    get(code).skills = list
      .sort((a, b) => b.importance - a.importance)
      .slice(0, MAX_SKILLS)
      .map((s) => s.name);
  }

  for (const row of usableRows("sample_of_reported_titles", files.sample_of_reported_titles,
    [CODE_COL, "Reported Job Title"], minimums)) {
    get(row[CODE_COL]).titles.push({
      kind: "reported",
      title: clean(row["Reported Job Title"]),
      featured: row["Shown in My Next Move"] === "Y",
    });
  }
  for (const row of usableRows("job_titles", files.job_titles, [CODE_COL, "Job Title"], minimums)) {
    get(row[CODE_COL]).titles.push({ kind: "alternate", title: clean(row["Job Title"]), featured: false });
  }

  for (const row of usableRows("related_occupations", files.related_occupations,
    [CODE_COL, "Related O*NET-SOC Code", "Relatedness Tier", "Index"], minimums,
    (row) => row["Relatedness Tier"] in RELATED_TIERS)) {
    get(row[CODE_COL]).related.push({
      code: row["Related O*NET-SOC Code"],
      tier: RELATED_TIERS[row["Relatedness Tier"]],
      rank: Number(row["Index"]),
    });
  }

  // Interest scores: the six RIASEC areas on O*NET's 1 to 7 "OI" scale.
  for (const row of usableRows("career_interest_types", files.career_interest_types,
    [CODE_COL, "Element Name", "Data Value"], minimums, (row) => row["Scale ID"] === "OI")) {
    const area = row["Element Name"].toLowerCase();
    if ((INTEREST_AREAS as readonly string[]).includes(area)) {
      get(row[CODE_COL])[`interest_${area}` as InterestColumn] = Number(row["Data Value"]);
    }
  }

  // Titles longer than the database allows are left out rather than rejecting the career.
  for (const d of details.values()) d.titles = d.titles.filter((t) => t.title.length <= 200);
  return details;
}

/** Turns occupation_data.csv plus the details into staged records: valid, or rejected with a reason. */
export function parseOccupations(csv: string, details = new Map<string, Details>()): StagedRecord<Occupation>[] {
  const rows = parseCsv(csv);
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const code = row["O*NET-SOC Code"];
    const result = occupationSchema.safeParse({
      onet_code: code,
      title: row["Title"],
      description: row["Description"],
      ...(details.get(code) ?? emptyDetails),
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
  minimums: Record<DetailFile, number> = DETAIL_FILES,
): Promise<AdapterResult<Occupation>> {
  const page = await fetcher.get(DATABASE_PAGE);
  if (page.status !== 200) throw new Error(`O*NET database page returned ${page.status}`);
  const { release, csvUrl } = findLatestRelease(page.body);

  // The release number is O*NET's real version. Their ETags differ between
  // servers for the same file, so they can't tell us if it changed.
  if (release === previous.release) return { status: "unchanged", release, etag: previous.etag };

  async function download(url: string) {
    const file = await fetcher.get(url);
    if (file.status !== 200) throw new Error(`${url} returned ${file.status}`);
    return file;
  }

  const occupations = await download(csvUrl);
  const files = {} as Record<DetailFile, string>;
  for (const name of Object.keys(DETAIL_FILES) as DetailFile[]) {
    files[name] = (await download(csvUrl.replace("occupation_data.csv", `${name}.csv`))).body;
  }

  return {
    status: "fetched",
    release,
    etag: occupations.etag,
    records: parseOccupations(occupations.body, buildDetails(files, minimums)),
  };
}
