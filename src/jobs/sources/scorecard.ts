// College Scorecard (U.S. Department of Education): colleges and their
// programs. Spec: docs/specs/programs-and-colleges.md.
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const API = "https://api.data.gov/ed/collegescorecard/v1/schools";
const PER_PAGE = 100;
// 1,000 requests an hour per key; 2 a second is about 30 seconds of waiting.
export const SCORECARD_DELAY_MS = 500;

const P = "latest.programs.cip_4_digit";
// The fields the Scorecard website itself uses (its data dictionary marks
// them "shown/used on consumer website"), and nothing else.
const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.ownership",
  "school.school_url",
  "latest.cost.avg_net_price.public",
  "latest.cost.avg_net_price.private",
  "latest.admissions.admission_rate.overall",
  "latest.completion.outcome_percentage_suppressed.all_students.8yr.award_pooled",
  "latest.student.size",
  `${P}.code`,
  `${P}.title`,
  `${P}.credential.level`,
  `${P}.credential.title`,
  `${P}.earnings.4_yr.overall_median_earnings`,
  `${P}.earnings.1_yr.overall_median_earnings`,
  `${P}.debt.staff_grad_plus.all.eval_inst.median`,
  `${P}.counts.ipeds_awards2`,
].join(",");

// Operating schools that mainly award certificates or degrees (1 to 4).
export function pageUrl(page: number) {
  return `${API}?school.operating=1&school.degrees_awarded.predominant__range=1..4&per_page=${PER_PAGE}&page=${page}&fields=${FIELDS}`;
}

const money = z.number().nullish();
const programSchema = z.object({
  code: z.string().regex(/^\d{4}$/),
  title: z.string().trim().min(1),
  credential: z.object({ level: z.number().int().min(1).max(8), title: z.string().trim().min(1) }),
  earnings: z
    .object({
      "4_yr": z.object({ overall_median_earnings: money }).nullish(),
      "1_yr": z.object({ overall_median_earnings: money }).nullish(),
    })
    .nullish(),
  debt: z
    .object({ staff_grad_plus: z.object({ all: z.object({ eval_inst: z.object({ median: money }) }) }) })
    .nullish(),
  counts: z.object({ ipeds_awards2: z.number().nullish() }).nullish(),
});

const schoolSchema = z.object({
  id: z.number().int().positive(),
  "school.name": z.string().trim().min(1).max(200),
  "school.city": z.string().trim().max(100).nullish(),
  "school.state": z.string().regex(/^[A-Z]{2}$/).nullish(),
  "school.ownership": z.number().int().nullish(),
  "school.school_url": z.string().nullish(),
  "latest.cost.avg_net_price.public": money,
  "latest.cost.avg_net_price.private": money,
  "latest.admissions.admission_rate.overall": z.number().min(0).max(1).nullish(),
  "latest.completion.outcome_percentage_suppressed.all_students.8yr.award_pooled": z.number().min(0).max(1).nullish(),
  "latest.student.size": z.number().int().min(0).nullish(),
  [P]: z.array(z.unknown()).nullish(),
});

const OWNERSHIP = { 1: "public", 2: "private_nonprofit", 3: "for_profit" } as const;

export type Program = {
  cip4: string;
  credential_level: number;
  title: string;
  credential_title: string;
  earnings_4yr: number | null;
  earnings_1yr: number | null;
  median_debt: number | null;
  graduates: number | null;
};

export type Institution = {
  unitid: number;
  name: string;
  city: string | null;
  state: string | null;
  ownership: (typeof OWNERSHIP)[keyof typeof OWNERSHIP] | null;
  website: string | null;
  net_price: number | null;
  admission_rate: number | null;
  graduation_rate: number | null;
  students: number | null;
  programs: Program[];
};

const positive = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? Math.round(n) : null);

/** "www.aamu.edu/" becomes "https://www.aamu.edu"; anything odd is dropped. */
export function normalizeWebsite(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname.includes(".")) return null;
    parsed.protocol = "https:";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * One school from the API as a staged record. Programs without graduates or
 * earnings are left out (nothing to show); a bad program is dropped, not the
 * whole school.
 */
export function parseSchool(raw: unknown): StagedRecord<Institution> {
  const school = schoolSchema.safeParse(raw);
  const id = String((raw as { id?: unknown })?.id ?? "unknown");
  if (!school.success) {
    return {
      status: "rejected",
      id,
      reason: school.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      raw,
    };
  }
  const s = school.data;
  const ownership = OWNERSHIP[s["school.ownership"] as keyof typeof OWNERSHIP] ?? null;
  const netPrice = ownership === "public" ? s["latest.cost.avg_net_price.public"] : s["latest.cost.avg_net_price.private"];

  const programs: Program[] = [];
  for (const rawProgram of s[P] ?? []) {
    const p = programSchema.safeParse(rawProgram);
    if (!p.success) continue;
    const program: Program = {
      cip4: `${p.data.code.slice(0, 2)}.${p.data.code.slice(2)}`,
      credential_level: p.data.credential.level,
      title: p.data.title.replace(/\.$/, ""),
      credential_title: p.data.credential.title,
      earnings_4yr: positive(p.data.earnings?.["4_yr"]?.overall_median_earnings),
      earnings_1yr: positive(p.data.earnings?.["1_yr"]?.overall_median_earnings),
      median_debt: positive(p.data.debt?.staff_grad_plus.all.eval_inst.median),
      graduates: p.data.counts?.ipeds_awards2 ?? null,
    };
    if (program.graduates || program.earnings_4yr || program.earnings_1yr) programs.push(program);
  }

  return {
    status: "valid",
    id: String(s.id),
    value: {
      unitid: s.id,
      name: s["school.name"],
      city: s["school.city"] || null,
      state: s["school.state"] ?? null,
      ownership,
      website: normalizeWebsite(s["school.school_url"]),
      net_price: typeof netPrice === "number" && netPrice >= 0 ? Math.round(netPrice) : null,
      admission_rate: s["latest.admissions.admission_rate.overall"] ?? null,
      graduation_rate: s["latest.completion.outcome_percentage_suppressed.all_students.8yr.award_pooled"] ?? null,
      students: s["latest.student.size"] ?? null,
      programs,
    },
  };
}

const pageSchema = z.object({
  metadata: z.object({ page: z.number(), total: z.number(), per_page: z.number() }),
  results: z.array(z.unknown()),
});

export async function readScorecard(
  fetcher: Fetcher,
  _previous: { etag: string | null; release: string | null },
  env: { SCORECARD_API_KEY?: string },
): Promise<AdapterResult<Institution>> {
  if (!env.SCORECARD_API_KEY) throw new Error("SCORECARD_API_KEY is not set (see .env.example)");
  // In a header, never the URL: failing URLs end up in error messages and logs.
  const headers = { "X-Api-Key": env.SCORECARD_API_KEY, Accept: "application/json" };

  const records: StagedRecord<Institution>[] = [];
  for (let page = 0, total = 1; page * PER_PAGE < total; page++) {
    const response = await fetcher.get(pageUrl(page), { headers });
    if (response.status !== 200) throw new Error(`College Scorecard page ${page} returned ${response.status}`);
    const data = pageSchema.parse(JSON.parse(response.body));
    total = data.metadata.total;
    records.push(...data.results.map(parseSchool));
  }
  return { status: "fetched", release: null, etag: null, records };
}
