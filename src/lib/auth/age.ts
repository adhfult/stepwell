/**
 * Session-only cookie (no personal data, value "1") set when the age check
 * says under 13, so trying again in the same browser session shows the same
 * message instead of the form (decision 0005, FTC guidance on age screens).
 */
export const AGE_BLOCK_COOKIE = "sw_signup_blocked";

/**
 * Whether someone born in `birthMonth` (1-12) of `birthYear` is certainly 13 or
 * older on `today` (decision 0005). Only month and year are asked, so someone
 * born in this month 13 years ago counts as under 13: their birthday may not
 * have come yet. UTC keeps the answer the same on every server.
 */
export function isAtLeast13(birthMonth: number, birthYear: number, today: Date): boolean {
  const birthInMonths = birthYear * 12 + (birthMonth - 1);
  const todayInMonths = today.getUTCFullYear() * 12 + today.getUTCMonth();
  return todayInMonths - birthInMonths > 13 * 12;
}
