// USAJOBS Search API (U.S. Office of Personnel Management): open federal
// postings on the student hiring path. Spec: docs/specs/internships.md.
import { z } from "zod";
import { STATES } from "../../lib/profile/options.ts";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const API = "https://data.usajobs.gov/api/search";
const PER_PAGE = 500; // the API's maximum
const MAX_PAGES = 20; // the API returns at most 10,000 rows per query

export function pageUrl(page: number) {
  return `${API}?HiringPath=student&ResultsPerPage=${PER_PAGE}&Page=${page}`;
}

export type PayInterval = "year" | "month" | "biweekly" | "week" | "day" | "hour";

export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  places: string[];
  states: string[];
  remote: boolean;
  pay_min: number | null;
  pay_max: number | null;
  pay_interval: PayInterval | null;
  who_may_apply: string | null;
  closes_on: string;
  summary: string | null;
  url: string;
};

// The docs show codes ("PA"); live responses may spell them out ("Per Year").
const INTERVALS: Record<string, PayInterval> = {
  PA: "year", "PER YEAR": "year",
  PM: "month", "PER MONTH": "month",
  BW: "biweekly", "BI-WEEKLY": "biweekly", "PER BIWEEKLY": "biweekly",
  PW: "week", "PER WEEK": "week",
  PD: "day", "PER DAY": "day",
  PH: "hour", "PER HOUR": "hour",
};
const UNPAID = new Set(["WC", "WITHOUT COMPENSATION"]);

// The student hiring path also returns ordinary jobs that merely accept
// students among many paths (12 for "open to everyone"). A student job lists
// at most 3 paths, or says what it is in its title or offering type.
const STUDENT_JOB = /intern|student|trainee|co-?op|cooperative education|clerk|scholarship|work study|practicum|fellow|pathways/i;
export function isStudentJob(title: string, hiringPaths: string[], offeringTypes: string[]) {
  return hiringPaths.length <= 3 || STUDENT_JOB.test(title) || offeringTypes.some((o) => /intern/i.test(o));
}

const STATE_CODES = new Map<string, string>(STATES.map((s) => [s.label.toLowerCase(), s.value]));

/** Plain text: no tags, control characters or long dashes, spaces collapsed, cut at a word. */
export function cleanText(text: string | null | undefined, max: number): string | null {
  const plain = (text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s*[\u2013\u2014]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?])/g, "$1")
    .trim();
  if (!plain) return null;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max / 2 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

const amount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    const n = Number(v);
    // Under $1 is a placeholder (live postings list "$0.01 to $18.00"), not real pay.
    return v != null && v !== "" && Number.isFinite(n) && n >= 1 ? Math.round(n * 100) / 100 : null;
  });

const itemSchema = z.object({
  MatchedObjectId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d{1,20}$/)),
  MatchedObjectDescriptor: z.object({
    PositionTitle: z.string().trim().min(1),
    OrganizationName: z.string().nullish(),
    DepartmentName: z.string().nullish(),
    PositionURI: z.string(),
    PositionLocation: z
      .array(z.object({ LocationName: z.string().nullish(), CountrySubDivisionCode: z.string().nullish() }))
      .nullish(),
    // A real calendar day: one impossible date ("2026-11-31") would fail the whole merge.
    ApplicationCloseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/)
      .refine((d) => {
        // zod runs this even when the regex failed, so it must not throw.
        const t = new Date(`${d.slice(0, 10)}T00:00:00Z`);
        return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d.slice(0, 10));
      }, "not a real date"),
    PositionRemuneration: z
      .array(
        z.object({
          MinimumRange: amount,
          MaximumRange: amount,
          RateIntervalCode: z.string().nullish(),
          Description: z.string().nullish(),
        }),
      )
      .nullish(),
    QualificationSummary: z.string().nullish(),
    PositionOfferingType: z.array(z.object({ Name: z.string().nullish() })).nullish().catch(null),
    UserArea: z
      .object({
        Details: z
          .object({
            WhoMayApply: z.object({ Name: z.string().nullish() }).nullish(),
            // Search results leave WhoMayApply empty; this says the same ("Students, Recent graduates").
            HiringPathDisplay: z.array(z.string()).nullish().catch(null),
            HiringPath: z.array(z.string()).nullish().catch(null),
            RemoteIndicator: z.union([z.boolean(), z.string()]).nullish(),
          })
          .nullish(),
      })
      .nullish(),
  }),
});

// Kept in capitals when a whole title is in capitals ("STEM INTERN").
const ACRONYMS = new Set(["STEM", "ROTC", "JROTC", "DOD", "DOJ", "DHS", "NASA", "USDA", "EPA", "GIS", "EMT", "LPN", "USA", "III", "MWR", "BHIP"]);
const SMALL_WORDS = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to"]);

/**
 * Some agencies write titles in capitals, which reads like shouting (DESIGN.md:
 * no all-caps). Only a title with no lowercase letters changes, word by word:
 * "COMPUTER ENGINEER" to "Computer Engineer", keeping acronyms like IT.
 */
export function unshout(title: string) {
  if (/[a-z]/.test(title)) return title;
  let first = true;
  return title.replace(/[A-Z][A-Z']*/g, (word) => {
    const lower = word.toLowerCase();
    // Two-letter words that aren't "of", "in" and so on are codes: GS, WG, VA.
    const keep = ACRONYMS.has(word) || (word.length <= 2 && !SMALL_WORDS.has(lower));
    const out = keep ? word : !first && SMALL_WORDS.has(lower) ? lower : word[0] + lower.slice(1);
    first = false;
    return out;
  });
}

/** The posting's link on usajobs.gov, normalized (live links can carry ":443"); null if it points anywhere else. */
export function usajobsUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /^(www\.)?usajobs\.gov$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * One posting as a staged record, or null for postings Stepwell leaves out
 * on purpose (closed, not a student job, or unpaid). Only a missing id, title, link or
 * closing date rejects; odd optional fields become empty instead, so a small
 * change at USAJOBS can't trip the circuit breaker.
 */
export function parsePosting(raw: unknown, today: string): StagedRecord<Opportunity> | null {
  const parsed = itemSchema.safeParse(raw);
  const id = String((raw as { MatchedObjectId?: unknown })?.MatchedObjectId ?? "unknown");
  const reject = (reason: string): StagedRecord<Opportunity> => ({ status: "rejected", id, reason, raw });
  if (!parsed.success) return reject(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));

  const d = parsed.data.MatchedObjectDescriptor;
  const url = usajobsUrl(d.PositionURI);
  if (!url) return reject(`PositionURI is not a usajobs.gov link: ${d.PositionURI}`);

  const closesOn = d.ApplicationCloseDate.slice(0, 10);
  if (closesOn < today) return null;

  const hiringPaths = d.UserArea?.Details?.HiringPath ?? [];
  const offeringTypes = (d.PositionOfferingType ?? []).map((o) => o.Name ?? "");
  if (!isStudentJob(d.PositionTitle, hiringPaths, offeringTypes)) return null;

  const pay = d.PositionRemuneration?.[0];
  const code = (pay?.RateIntervalCode ?? pay?.Description ?? "").trim().toUpperCase();
  if (UNPAID.has(code) || UNPAID.has((pay?.Description ?? "").trim().toUpperCase())) return null;
  const interval = INTERVALS[code] ?? INTERVALS[(pay?.Description ?? "").trim().toUpperCase()] ?? null;

  const locations = d.PositionLocation ?? [];
  // Remote postings end in ", United States"; other places don't name the country.
  const places = [
    ...new Set(
      locations.map((l) => cleanText(l.LocationName?.replace(/, United States$/, ""), 200)).filter((p) => p !== null),
    ),
  ];
  const states = [
    ...new Set(
      locations.map((l) => STATE_CODES.get((l.CountrySubDivisionCode ?? "").trim().toLowerCase())).filter((s) => s !== undefined),
    ),
  ];
  const remoteFlag = d.UserArea?.Details?.RemoteIndicator;

  return {
    status: "valid",
    id: parsed.data.MatchedObjectId,
    value: {
      id: parsed.data.MatchedObjectId,
      title: unshout(cleanText(d.PositionTitle, 300)!),
      organization: cleanText(d.OrganizationName, 200) ?? cleanText(d.DepartmentName, 200) ?? "U.S. federal government",
      places: places.slice(0, 500),
      states,
      remote: remoteFlag === true || remoteFlag === "true" || places.some((p) => /remote job/i.test(p)),
      pay_min: pay?.MinimumRange ?? null,
      pay_max: pay?.MaximumRange ?? null,
      pay_interval: interval,
      who_may_apply:
        cleanText(d.UserArea?.Details?.WhoMayApply?.Name, 200) ??
        cleanText(d.UserArea?.Details?.HiringPathDisplay?.join(", "), 200),
      closes_on: closesOn,
      summary: cleanText(d.QualificationSummary, 500),
      url,
    },
  };
}

const pageSchema = z.object({
  SearchResult: z.object({
    SearchResultCountAll: z.coerce.number().int().min(0),
    SearchResultItems: z.array(z.unknown()),
  }),
});

export async function readUsajobs(
  fetcher: Fetcher,
  _previous: { etag: string | null; release: string | null },
  env: { USAJOBS_API_KEY?: string; USAJOBS_EMAIL?: string },
  // Postings close at the end of their closing day in U.S. Eastern time (as the /internships page counts).
  today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()),
): Promise<AdapterResult<Opportunity>> {
  if (!env.USAJOBS_API_KEY || !env.USAJOBS_EMAIL) {
    throw new Error("USAJOBS_API_KEY and USAJOBS_EMAIL must be set (see docs/specs/internships.md)");
  }
  // USAJOBS asks for the key holder's email as the User-Agent. The key goes
  // in a header, never the URL: failing URLs end up in error messages and logs.
  const headers = { "User-Agent": env.USAJOBS_EMAIL, "Authorization-Key": env.USAJOBS_API_KEY, Accept: "application/json" };

  const byId = new Map<string, StagedRecord<Opportunity>>(); // a posting on two pages is staged once
  for (let page = 1, pages = 1; page <= pages; page++) {
    const response = await fetcher.get(pageUrl(page), { headers });
    if (response.status !== 200) throw new Error(`USAJOBS page ${page} returned ${response.status}`);
    const data = pageSchema.parse(JSON.parse(response.body)).SearchResult;
    pages = Math.min(MAX_PAGES, Math.ceil(data.SearchResultCountAll / PER_PAGE));
    for (const item of data.SearchResultItems) {
      const record = parsePosting(item, today);
      if (record) byId.set(record.id, record);
    }
  }
  return { status: "fetched", release: null, etag: null, records: [...byId.values()] };
}
