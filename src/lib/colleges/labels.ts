import { z } from "zod";
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

const OWNERSHIP: Record<string, string> = {
  public: "Public",
  private_nonprofit: "Private nonprofit",
  for_profit: "For-profit",
};

export const ownershipName = (value: string | null) => (value ? (OWNERSHIP[value] ?? null) : null);

const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;

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
