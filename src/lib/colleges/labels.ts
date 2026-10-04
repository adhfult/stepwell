import { z } from "zod";
import { actToSat, satToAct } from "@/lib/gpa/concordance";
import { STATES } from "@/lib/profile/options";
import { CAPS, toPercent } from "@/lib/scale";

/** Credential filter choices, matching colleges_for_career()'s levels. */
export const LEVELS = [
  { value: "certificate", label: "Certificate" },
  { value: "associate", label: "Associate's degree" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "graduate", label: "Graduate degree or certificate" },
] as const;

export const filtersSchema = z.object({
  state: z.enum(STATES.map((s) => s.value) as [string, ...string[]]).optional().catch(undefined),
  level: z.enum(LEVELS.map((l) => l.value) as [string, ...string[]]).optional().catch(undefined),
});

type Choice = { value: string; label: string };
const values = (choices: readonly Choice[]) => choices.map((c) => c.value) as [string, ...string[]];
const choice = (choices: readonly Choice[]) => z.enum(values(choices)).optional().catch(undefined);
/** A whole number typed into a GET form; blank or odd input is ignored. */
const whole = (min: number, max: number) =>
  z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().min(min).max(max)).optional().catch(undefined);
const text = z.string().trim().max(100).optional().catch(undefined);

export const TYPES = [
  { value: "public", label: "Public" },
  { value: "private_nonprofit", label: "Private nonprofit" },
  { value: "for_profit", label: "For-profit" },
] as const;
export const SIZES = [
  { value: "small", label: "Small (under 5,000 students)" },
  { value: "medium", label: "Medium (5,000 to 15,000)" },
  { value: "large", label: "Large (over 15,000)" },
] as const;
/** Family income brackets, in the order of institutions.net_price_by_income. */
export const BRACKETS = [
  { value: "1", label: "$0 to $30,000" },
  { value: "2", label: "$30,001 to $48,000" },
  { value: "3", label: "$48,001 to $75,000" },
  { value: "4", label: "$75,001 to $110,000" },
  { value: "5", label: "Over $110,000" },
] as const;
export const ADMIT = [
  { value: "under25", label: "Under 25%" },
  { value: "25to50", label: "25% to 50%" },
  { value: "50to75", label: "50% to 75%" },
  { value: "over75", label: "75% or more" },
] as const;
export const LOCALES = [
  { value: "city", label: "City" },
  { value: "suburb", label: "Suburb" },
  { value: "town", label: "Town" },
  { value: "rural", label: "Rural" },
] as const;
export const YEARS = [
  { value: "4", label: "Four-year" },
  { value: "2", label: "Two-year or shorter" },
] as const;
export const SERVES = [
  { value: "hbcu", label: "Historically Black college or university" },
  { value: "pbi", label: "Predominantly Black institution" },
  { value: "hsi", label: "Hispanic-serving institution" },
  { value: "tribal", label: "Tribal college or university" },
  { value: "aanapisi", label: "Asian American and Native American Pacific Islander-serving" },
  { value: "annh", label: "Alaska Native or Native Hawaiian-serving" },
  { value: "nant", label: "Native American non-tribal institution" },
] as const;
export const SORTS = [
  { value: "name", label: "Name" },
  { value: "size", label: "Size, largest first" },
  { value: "price", label: "Net price, lowest first" },
] as const;
const POLICIES: Record<string, string> = {
  required: "Test scores required",
  recommended: "Test scores recommended",
  considered: "Test scores considered, not required",
  neither: "Test scores neither required nor recommended",
};

export const labelOf = (choices: readonly Choice[], value: string | null | undefined) =>
  choices.find((c) => c.value === value)?.label ?? null;
export const policyName = (value: string | null) => (value ? (POLICIES[value] ?? null) : null);

/** /colleges search params. Anything malformed is dropped, like the other list pages. */
export const directorySchema = z.object({
  q: text,
  program: text,
  state: z.enum(STATES.map((s) => s.value) as [string, ...string[]]).optional().catch(undefined),
  type: choice(TYPES),
  size: choice(SIZES),
  bracket: choice(BRACKETS),
  max: whole(0, 200_000),
  admit: choice(ADMIT),
  optional: z.literal("1").optional().catch(undefined),
  setting: choice(LOCALES),
  years: choice(YEARS),
  serves: choice(SERVES),
  sort: choice(SORTS),
  page: whole(1, 10_000),
  sat: whole(400, 1600),
  act: whole(1, 36),
});
export type Directory = z.infer<typeof directorySchema>;

export type Fit = "below" | "in" | "above";
export type TestRanges = {
  sat_read_25: number | null;
  sat_read_75: number | null;
  sat_math_25: number | null;
  sat_math_75: number | null;
  act_25: number | null;
  act_75: number | null;
};

/**
 * Where a student's score sits against a college's middle 50%: "below" the
 * 25th percentile, "in" the range, or "above" the 75th. SAT compares to
 * reading + math added together (approximate; the page says so). The SAT
 * when the college reports it and the student has one, else the ACT; a
 * student with only the other test is converted with the official
 * concordance. null when there's nothing to compare.
 */
export function testFit(
  c: TestRanges,
  mine: { sat?: number; act?: number },
): { fit: Fit; test: "SAT" | "ACT"; converted: boolean } | null {
  const place = (score: number, low: number, high: number): Fit => (score < low ? "below" : score > high ? "above" : "in");
  const { sat_read_25: r25, sat_read_75: r75, sat_math_25: m25, sat_math_75: m75, act_25, act_75 } = c;
  const satRange = r25 !== null && r75 !== null && m25 !== null && m75 !== null ? [r25 + m25, r75 + m75] : null;
  const actRange = act_25 !== null && act_75 !== null ? [act_25, act_75] : null;
  const asSat = mine.act ? actToSat(mine.act) : null;
  const asAct = mine.sat ? satToAct(mine.sat) : null;
  if (satRange && mine.sat) return { fit: place(mine.sat, satRange[0], satRange[1]), test: "SAT", converted: false };
  if (actRange && mine.act) return { fit: place(mine.act, actRange[0], actRange[1]), test: "ACT", converted: false };
  if (satRange && asSat) return { fit: place(asSat, satRange[0], satRange[1]), test: "SAT", converted: true };
  if (actRange && asAct) return { fit: place(asAct, actRange[0], actRange[1]), test: "ACT", converted: true };
  return null;
}

/** The marker's words: "Your SAT is in the middle 50%", or "Your ACT (as an SAT) is below the middle 50%". */
export function fitText(f: { fit: Fit; test: "SAT" | "ACT"; converted: boolean }): string {
  const yours = f.converted ? `Your ${f.test === "SAT" ? "ACT (as an SAT)" : "SAT (as an ACT)"}` : `Your ${f.test}`;
  return `${yours} is ${f.fit} the middle 50%`;
}

const OWNERSHIP: Record<string, string> = {
  public: "Public",
  private_nonprofit: "Private nonprofit",
  for_profit: "For-profit",
};

export const ownershipName = (value: string | null) => (value ? (OWNERSHIP[value] ?? null) : null);

export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * "Graduates earn $52,000 a year": the 4-year figure (the page explains it
 * once), or the 1-year figure marked as such when that's all there is.
 */
export function earningsText(earnings4: number | null, earnings1: number | null): string | null {
  if (earnings4) return `Graduates earn ${dollars(earnings4)} a year`;
  if (earnings1) return `Graduates earn ${dollars(earnings1)} a year (1 year after finishing)`;
  return null;
}

export const debtText = (debt: number | null) => (debt ? `Median federal loan debt ${dollars(debt)}` : null);
/** "www.aamu.edu" from "https://www.aamu.edu/...", so a link shows where it goes. */
export function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export type CollegeMeter = {
  label: string;
  /** Printed beside the bar; null shows "Not reported" and no bar. */
  value: string | null;
  percent: number | null;
  /** Shown on phones too (the rest wait for 640px, where there's room). */
  phone: boolean;
};

/**
 * The four bars on a college row (DESIGN.md "Data graphics"), in reading
 * order: what graduates earn, their debt, the yearly cost, the graduation rate.
 */
export function collegeMeters(c: {
  earnings_4yr: number | null;
  earnings_1yr: number | null;
  median_debt: number | null;
  net_price: number | null;
  graduation_rate: number | string | null;
}): CollegeMeter[] {
  const earnings = c.earnings_4yr ?? c.earnings_1yr;
  const money = (n: number | null, cap: number, label: string, phone: boolean, unit = "") => ({
    label,
    value: n === null ? null : `${dollars(Number(n))}${unit}`,
    percent: n === null ? null : toPercent(Number(n), cap),
    phone,
  });
  const rate = c.graduation_rate === null ? null : Number(c.graduation_rate);
  return [
    money(earnings, CAPS.earnings, c.earnings_4yr ? "Graduates earn" : "Graduates earn (1 year after)", false, " a year"),
    money(c.median_debt, CAPS.debt, "Median loan debt", false),
    money(c.net_price, CAPS.netPrice, "Net price", true, " a year"),
    {
      label: "Graduation rate",
      value: rate === null ? null : `${Math.round(rate * 100)}%`,
      percent: rate === null ? null : toPercent(rate, CAPS.rate),
      phone: true,
    },
  ];
}
