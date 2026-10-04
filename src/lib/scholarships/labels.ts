import { z } from "zod";

/** Consent text version for eligibility answers; raising it asks everyone again (decision 0006). */
export const CONSENT_VERSION = 1;

/** Fields of study as 2-digit CIP families, in words, for the eligibility form. */
export const FIELDS = [
  { value: "01", label: "Agriculture" },
  { value: "03", label: "Natural resources and conservation" },
  { value: "09", label: "Communication and journalism" },
  { value: "11", label: "Computer science and IT" },
  { value: "13", label: "Education and teaching" },
  { value: "14", label: "Engineering" },
  { value: "15", label: "Engineering technology" },
  { value: "22", label: "Law" },
  { value: "26", label: "Biology" },
  { value: "27", label: "Math and statistics" },
  { value: "40", label: "Physical sciences (chemistry, physics)" },
  { value: "42", label: "Psychology" },
  { value: "43", label: "Public safety and security" },
  { value: "44", label: "Public service and social work" },
  { value: "45", label: "Social sciences" },
  { value: "46", label: "Construction trades" },
  { value: "47", label: "Mechanics and repair" },
  { value: "48", label: "Precision production (such as welding)" },
  { value: "50", label: "Arts, design and music" },
  { value: "51", label: "Health and medicine" },
  { value: "52", label: "Business" },
] as const;

const FIELD_VALUES = FIELDS.map((f) => f.value) as [string, ...string[]];

const optional = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v === "prefer_not" || v === null ? undefined : v), z.enum(values).optional());

/** Server-side check of the eligibility form. Empty or "Prefer not to say" = no answer. */
export const eligibilitySchema = z.object({
  gpa: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.trim()) : undefined),
    z.number({ error: "Enter your GPA as a number, like 3.4" }).min(0, "GPA can't be below 0").max(5, "GPA can't be above 5").optional(),
  ),
  fields: z.array(z.enum(FIELD_VALUES)).max(5, "Choose up to 5 fields"),
  first_generation: optional(["yes", "no"]),
  citizenship: optional(["citizen", "eligible_noncitizen", "other"]),
  military_family: optional(["yes", "no"]),
  plans_fafsa: optional(["yes", "no", "unsure"]),
  consent: z.literal("yes", { error: "Tick the box to say it's OK to use your answers" }),
});

export type EligibilityInput = z.infer<typeof eligibilitySchema>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const short = (d: Date) => `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
const DAY = 86_400_000;

export type Deadline = { text: string; tone: "urgent" | "closed" | "normal" };

/**
 * DESIGN.md "Dates and deadlines": 14 days or fewer is urgent ("Closes in 5
 * days (Mar 1)"), passed is "Closed Mar 1", repeating dates say "Usually due
 * around". Listings not checked in 12 months send students to the official page.
 */
export function deadlineText(
  s: { deadline_kind: string; deadline_date: string | null; deadline_month_day: string | null; checked_at: string },
  today: Date = new Date(),
): Deadline {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (todayUtc - Date.parse(s.checked_at) > 365 * DAY) {
    return { text: "Check the official page for this year's details", tone: "normal" };
  }
  if (s.deadline_kind === "date" && s.deadline_date) {
    const due = new Date(`${s.deadline_date}T00:00:00Z`);
    const days = Math.round((due.getTime() - todayUtc) / DAY);
    if (days < 0) return { text: `Closed ${short(due)}`, tone: "closed" };
    if (days === 0) return { text: `Closes today (${short(due)})`, tone: "urgent" };
    if (days <= 14) return { text: `Closes in ${days} ${days === 1 ? "day" : "days"} (${short(due)})`, tone: "urgent" };
    return { text: `Due ${short(due)}, ${due.getUTCFullYear()}`, tone: "normal" };
  }
  if (s.deadline_kind === "usually" && s.deadline_month_day) {
    const [m, d] = s.deadline_month_day.split("-").map(Number);
    return { text: `Usually due around ${MONTHS[m - 1]} ${d}`, tone: "normal" };
  }
  if (s.deadline_kind === "rolling") return { text: "Apply any time (rolling)", tone: "normal" };
  return { text: "Check the official page for the deadline", tone: "normal" };
}

/** The first listing with an amount whose deadline hasn't passed, for the home page's example. */
export function firstOpen<T extends Parameters<typeof deadlineText>[0] & { award_text: string | null }>(
  list: T[],
  today: Date = new Date(),
): T | null {
  return list.find((s) => s.award_text && deadlineText(s, today).tone !== "closed") ?? null;
}

/** "Checked September 2026" */
export function checkedText(checkedAt: string) {
  const d = new Date(`${checkedAt}T00:00:00Z`);
  return `Checked ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
