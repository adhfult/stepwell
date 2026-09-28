import { z } from "zod";

/**
 * Validation for the account forms. Server Actions run these on every
 * submission; the browser's checks are only a convenience.
 * Messages follow DESIGN.md "Writing": plain, specific, no blame.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: "Use an email address of 254 characters or fewer" })
  .pipe(z.email({ error: "Enter an email address, like name@example.com" }));

// Supabase Auth stores passwords with bcrypt, which reads at most 72 bytes.
export const newPasswordSchema = z
  .string()
  .min(8, { error: "Use at least 8 characters" })
  .max(72, { error: "Use 72 characters or fewer" });

const birthDateError = "Choose the month and year you were born";

/** Sign-up fields. `now` sets which birth years are offered (this year and 100 before). */
export function makeSignUpSchema(now: Date) {
  const thisYear = now.getUTCFullYear();
  const wholeNumber = (min: number, max: number) =>
    z.coerce
      .number({ error: birthDateError })
      .int({ error: birthDateError })
      .min(min, { error: birthDateError })
      .max(max, { error: birthDateError });

  return z.object({
    email: emailSchema,
    password: newPasswordSchema,
    birthMonth: wholeNumber(1, 12),
    birthYear: wholeNumber(thisYear - 100, thisYear),
  });
}
