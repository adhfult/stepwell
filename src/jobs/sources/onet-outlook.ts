// O*NET Web Services (CC BY 4.0): pay and outlook per career, from My Next
// Move's job outlook (BLS wage estimates and 2024 to 2034 projections).
// Spec: docs/specs/career-explorer.md, step 6.
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const API = "https://api-v2.onetcenter.org";
// O*NET's terms: no more than 5 requests a second. 2 a second leaves room
// (about 8 minutes for all 923 careers).
export const OUTLOOK_DELAY_MS = 500;
const PAGE_SIZE = 1000;

const listSchema = z.object({
  next: z.url().optional(),
  career: z.array(z.object({ code: z.string() })),
});

const money = z.number().positive().optional();
const outlookResponseSchema = z.object({
  outlook: z.object({ category: z.enum(["Bright", "Average", "Below Average"]) }),
  bright_outlook: z.array(z.object({ code: z.string() })).optional(),
  salary: z
    .object({
      soc_code: z.string().regex(/^\d{2}-\d{4}$/).optional(),
      annual_10th_percentile: money,
      annual_10th_percentile_over: money,
      annual_median: money,
      annual_median_over: money,
      annual_90th_percentile: money,
      annual_90th_percentile_over: money,
      hourly_10th_percentile: money,
      hourly_10th_percentile_over: money,
      hourly_median: money,
      hourly_median_over: money,
      hourly_90th_percentile: money,
      hourly_90th_percentile_over: money,
    })
    .optional(),
});

const CATEGORY = { Bright: "bright", Average: "average", "Below Average": "below_average" } as const;
const REASONS = new Set(["grow", "openings", "emerging"]);
// Our column, and O*NET's field name without "_over".
const PAY_FIELDS = [
  ["annual_low", "annual_10th_percentile"],
  ["annual_median", "annual_median"],
  ["annual_high", "annual_90th_percentile"],
  ["hourly_low", "hourly_10th_percentile"],
  ["hourly_median", "hourly_median"],
  ["hourly_high", "hourly_90th_percentile"],
] as const;

type PayColumn = (typeof PAY_FIELDS)[number][0];

export type Outlook = {
  onet_code: string;
  outlook: (typeof CATEGORY)[keyof typeof CATEGORY];
  bright_reasons: string[];
  wage_soc_code: string | null;
  or_more: PayColumn[];
} & Record<PayColumn, number | null>;

/** Turns one job_outlook response into our record. Unknown Bright Outlook reasons are left out. */
export function parseOutlook(code: string, body: unknown): Outlook {
  const data = outlookResponseSchema.parse(body);
  const salary = (data.salary ?? {}) as Record<string, number | string | undefined>;
  const record: Outlook = {
    onet_code: code,
    outlook: CATEGORY[data.outlook.category],
    bright_reasons: (data.bright_outlook ?? []).map((r) => r.code).filter((r) => REASONS.has(r)),
    wage_soc_code: (salary.soc_code as string | undefined) ?? null,
    or_more: [],
    annual_low: null,
    annual_median: null,
    annual_high: null,
    hourly_low: null,
    hourly_median: null,
    hourly_high: null,
  };
  for (const [column, field] of PAY_FIELDS) {
    const exact = salary[field] as number | undefined;
    const over = salary[`${field}_over`] as number | undefined;
    const value = exact ?? over;
    if (value === undefined) continue;
    // Whole dollars a year; cents an hour.
    record[column] = column.startsWith("annual") ? Math.round(value) : Math.round(value * 100) / 100;
    if (exact === undefined) record.or_more.push(column);
  }
  return record;
}

export async function readOnetOutlook(
  fetcher: Fetcher,
  _previous: { etag: string | null; release: string | null },
  env: { ONET_API_KEY?: string },
): Promise<AdapterResult<Outlook>> {
  if (!env.ONET_API_KEY) throw new Error("ONET_API_KEY is not set (see .env.example)");
  const headers = { "X-API-Key": env.ONET_API_KEY, Accept: "application/json" };

  async function getJson(url: string) {
    const response = await fetcher.get(url, { headers });
    return { status: response.status, body: response.status === 200 ? JSON.parse(response.body) : null };
  }

  // Every career My Next Move covers, page by page.
  const codes: string[] = [];
  for (let url: string | undefined = `${API}/mnm/careers/?start=1&end=${PAGE_SIZE}`; url; ) {
    const page = await getJson(url);
    if (page.status !== 200) throw new Error(`O*NET career list returned ${page.status}`);
    const list = listSchema.parse(page.body);
    codes.push(...list.career.map((c) => c.code));
    url = list.next;
  }

  const records: StagedRecord<Outlook>[] = [];
  for (const code of codes) {
    if (!/^\d{2}-\d{4}\.\d{2}$/.test(code)) {
      records.push({ status: "rejected", id: code, reason: "Not an O*NET code", raw: { code } });
      continue;
    }
    const response = await getJson(`${API}/mnm/careers/${code}/job_outlook`);
    // 422: O*NET has no outlook data for this career. Nothing to store.
    if (response.status === 422) continue;
    if (response.status !== 200) throw new Error(`Job outlook for ${code} returned ${response.status}`);
    try {
      records.push({ status: "valid", id: code, value: parseOutlook(code, response.body) });
    } catch (error) {
      const reason = error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : String(error);
      records.push({ status: "rejected", id: code, reason, raw: response.body });
    }
  }

  return { status: "fetched", release: null, etag: null, records };
}
