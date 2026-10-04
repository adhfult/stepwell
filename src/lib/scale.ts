/**
 * Fixed scales for the data bars (DESIGN.md "Data graphics"), the same on
 * every page so the same number always draws the same length. Above a cap
 * the bar is full; the printed number stays exact.
 */
export const CAPS = {
  pay: 200_000,
  earnings: 150_000,
  debt: 100_000,
  netPrice: 60_000,
  /** Rates are stored as fractions (0.64). */
  rate: 1,
} as const;

/** How far along its scale a value is, as a percentage clamped to 0–100. */
export function toPercent(value: number, max: number): number {
  return Math.min(100, Math.max(0, (value / max) * 100));
}
