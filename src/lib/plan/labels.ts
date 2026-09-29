import { z } from "zod";

/**
 * Year-by-year plan helpers (docs/specs/saved-plan.md). A school year is
 * named by the year it starts: 2027 means July 2027 to June 2028.
 */

export const TERMS = [
  { value: "full_year", label: "Whole year" },
  { value: "fall", label: "Fall" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
] as const;

export const KINDS = [
  { value: "task", label: "To do" },
  { value: "class", label: "Class" },
  { value: "application", label: "Application" },
] as const;

/** Server-side check for the add and edit forms; year "" means no set year. */
export const planItemSchema = z.object({
  title: z.string().trim().min(1, "Enter what you plan to do").max(200, "Keep it under 200 characters"),
  kind: z.enum(KINDS.map((k) => k.value)),
  academic_year: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(2000).max(2100)]),
  term: z.enum(TERMS.map((t) => t.value)),
  due_on: z.union([z.literal("").transform(() => null), z.iso.date()]),
});

/** The school year a date (YYYY-MM-DD) falls in. */
export function schoolYear(date: string) {
  const [y, m] = date.split("-").map(Number);
  return m >= 7 ? y : y - 1;
}

/** When the student finishes school, as the school year that starts then; null if unknown. */
function lastYear(stage: string | null, gradYear: number | null) {
  return gradYear && (stage === "middle_school" || stage === "high_school" || stage === "college") ? gradYear : null;
}

/** Where an item's year shows: years past graduation fold into "After high school". */
export function bucket(year: number, stage: string | null, gradYear: number | null) {
  const last = lastYear(stage, gradYear);
  return last && year > last ? last : year;
}

/** The school years to show: now through graduation, plus any year that has items. */
export function planYears(current: number, stage: string | null, gradYear: number | null, itemYears: number[]) {
  const years = new Set(itemYears.map((y) => bucket(y, stage, gradYear)));
  const last = lastYear(stage, gradYear);
  for (let y = current; last && y <= last; y++) years.add(y);
  years.add(current);
  return [...years].sort((a, b) => a - b);
}

const ORDINALS = ["6th", "7th", "8th", "9th", "10th", "11th", "12th"];

/** "11th grade (2027 to 2028)", "After high school (2029 on)" or "2027 to 2028". */
export function yearHeading(year: number, stage: string | null, gradYear: number | null) {
  const span = `${year} to ${year + 1}`;
  const last = lastYear(stage, gradYear);
  if (!last) return span;
  if (year >= last) return `${stage === "college" ? "After college" : "After high school"} (${last} on)`;
  if (stage === "college") return span;
  const grade = 12 - (last - 1 - year);
  return grade >= 6 ? `${ORDINALS[grade - 6]} grade (${span})` : span;
}

/** The school year a saved scholarship belongs in: its next deadline's, or this year. */
export function scholarshipYear(
  s: { deadline_kind: string; deadline_date: string | null; deadline_month_day: string | null },
  today: string,
) {
  if (s.deadline_kind === "date" && s.deadline_date) return schoolYear(s.deadline_date);
  if (s.deadline_kind === "usually" && s.deadline_month_day) {
    const thisYear = `${today.slice(0, 4)}-${s.deadline_month_day}`;
    const next = thisYear >= today ? thisYear : `${Number(today.slice(0, 4)) + 1}-${s.deadline_month_day}`;
    return schoolYear(next);
  }
  return schoolYear(today);
}

/** Saved colleges go in senior year (when applications are due), or this year. */
export function collegeYear(current: number, stage: string | null, gradYear: number | null) {
  const senior = gradYear && (stage === "middle_school" || stage === "high_school") ? gradYear - 1 : current;
  return Math.max(current, senior);
}
