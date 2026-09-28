import { z } from "zod";

/**
 * Plain words for O*NET's codes (DESIGN.md "Writing": words a 13-year-old
 * knows). Education categories are O*NET's "Required Level of Education"
 * (1 to 12); preparation is O*NET's job zone (1 to 5).
 */

const EDUCATION: Record<number, string> = {
  1: "Less than a high school diploma",
  2: "High school diploma or GED",
  3: "Certificate after high school",
  4: "Some college courses",
  5: "Associate's degree",
  6: "Bachelor's degree",
  7: "Certificate after a bachelor's degree",
  8: "Master's degree",
  9: "Certificate after a master's degree",
  10: "Professional degree (such as law or medicine)",
  11: "Doctoral degree",
  12: "Post-doctoral training",
};

const PREPARATION: Record<number, { name: string; detail: string }> = {
  1: { name: "Little preparation", detail: "A few days to a few months of training on the job." },
  2: { name: "Some preparation", detail: "Usually a high school diploma and some training on the job." },
  3: {
    name: "Medium preparation",
    detail: "Usually a vocational school, an apprenticeship, related work experience, or an associate's degree.",
  },
  4: { name: "Considerable preparation", detail: "Most people doing this work have a bachelor's degree." },
  5: { name: "Extensive preparation", detail: "Most people doing this work went to graduate school." },
};

export function educationName(level: number | null): string | null {
  return level === null ? null : (EDUCATION[level] ?? null);
}

/** "Bachelor's degree (62% of workers)", or null when O*NET has no data. */
export function typicalEducation(level: number | null, share: number | null): string | null {
  const name = educationName(level);
  if (!name) return null;
  return share === null ? name : `${name} (${share}% of workers)`;
}

export function preparation(jobZone: number | null) {
  return jobZone === null ? null : (PREPARATION[jobZone] ?? null);
}

/** One line of facts for a search result, e.g. "Bachelor's degree, considerable preparation". */
export function resultFacts(educationLevel: number | null, jobZone: number | null): string | null {
  const parts = [educationName(educationLevel), preparation(jobZone)?.name.toLowerCase()].filter(Boolean);
  if (parts.length === 0) return null;
  const line = parts.join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** "September 2026" for source lines. */
export function monthYear(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export const onetCodeSchema = z.string().regex(/^\d{2}-\d{4}\.\d{2}$/);

export const SEARCH_MAX = 100;
export const searchQuerySchema = z
  .string()
  .trim()
  .max(SEARCH_MAX, `Search for ${SEARCH_MAX} characters or fewer.`);

// Pay and outlook (O*NET Web Services job outlook; BLS data) -----------------

export type Pay = {
  annual_low: number | null;
  annual_median: number | null;
  annual_high: number | null;
  hourly_low: number | null;
  hourly_median: number | null;
  hourly_high: number | null;
  or_more: string[];
};

const dollars = (value: number, cents: boolean) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

/** Annual figures when published, otherwise hourly (DESIGN.md "Numbers and money"). */
function payUnit(pay: Pay) {
  if (pay.annual_median !== null) return { period: "annual", unit: "a year", cents: false } as const;
  if (pay.hourly_median !== null) return { period: "hourly", unit: "an hour", cents: true } as const;
  return null;
}

function amount(pay: Pay, period: "annual" | "hourly", level: "low" | "median" | "high", cents: boolean) {
  const column = `${period}_${level}` as const;
  const value = pay[column];
  if (value === null) return null;
  return `${dollars(Number(value), cents)}${pay.or_more.includes(column) ? " or more" : ""}`;
}

/** "$61,010 a year", "$23.94 an hour", "$239,200 or more a year", or null. */
export function medianPay(pay: Pay | null): string | null {
  const unit = pay && payUnit(pay);
  if (!pay || !unit) return null;
  return `${amount(pay, unit.period, "median", unit.cents)} ${unit.unit}`;
}

/** "Most people in this job earn $40,050 to $95,210 a year." or null. */
export function payRange(pay: Pay | null): string | null {
  const unit = pay && payUnit(pay);
  if (!pay || !unit) return null;
  const low = amount(pay, unit.period, "low", unit.cents);
  const high = amount(pay, unit.period, "high", unit.cents);
  if (!low || !high) return null;
  return `Most people in this job earn ${low} to ${high} ${unit.unit}.`;
}

const OUTLOOK: Record<string, { name: string; detail: string }> = {
  bright: { name: "Bright outlook", detail: "New jobs are very likely in the next few years." },
  average: { name: "Average outlook", detail: "Jobs are expected to grow at least 5% from 2024 to 2034." },
  below_average: { name: "Below average outlook", detail: "New jobs are less likely in the next few years." },
};

const REASONS: Record<string, string> = {
  grow: "It will grow quickly.",
  openings: "It will have many job openings.",
  emerging: "It's a new and emerging career.",
};

/** Name and plain explanation of an outlook, with the Bright Outlook reasons. */
export function outlookText(outlook: string, reasons: string[]) {
  const base = OUTLOOK[outlook];
  if (!base) return null;
  const why = reasons.map((r) => REASONS[r]).filter(Boolean);
  return { name: base.name, detail: [base.detail, ...why].join(" ") };
}
