import { z } from "zod";
import { STATES } from "@/lib/profile/options";

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
export const netPriceText = (price: number | null) => (price !== null ? `Net price ${dollars(price)} a year` : null);
export const rateText = (label: string, rate: number | string | null) =>
  rate !== null ? `${label} ${Math.round(Number(rate) * 100)}%` : null;

/** "www.aamu.edu" from "https://www.aamu.edu/...", so a link shows where it goes. */
export function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
