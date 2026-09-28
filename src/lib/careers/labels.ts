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
