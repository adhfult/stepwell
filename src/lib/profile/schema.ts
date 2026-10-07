import { z } from "zod";
import { isCountyIn } from "./counties";
import { STAGES, STATES } from "./options";

/**
 * Profile form validation, keyed by the form's field names so error
 * messages line up with fields. The same rules are check constraints in the
 * database (students can call the Data API directly), with a wider year
 * range there; this is the friendly, stricter check.
 */
export function makeProfileSchema(now: Date) {
  const thisYear = now.getUTCFullYear();
  const yearError = `Choose a year from ${thisYear - 1} to ${thisYear + 8}, or leave it empty`;

  return z.object({
    nickname: z
      .string()
      .trim()
      .max(40, { error: "Use 40 characters or fewer" })
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), { error: "Use letters, numbers and spaces only" }),
    stage: z.enum(STAGES.map((s) => s.value) as [string, ...string[]], {
      error: "Choose where you are in school",
    }),
    state: z.enum(STATES.map((s) => s.value) as [string, ...string[]], { error: "Choose your state" }),
    gradYear: z.union([
      z.literal(""),
      z.coerce
        .number({ error: yearError })
        .int({ error: yearError })
        .min(thisYear - 1, { error: yearError })
        .max(thisYear + 8, { error: yearError }),
    ]),
    county: z.union([z.literal(""), z.string().regex(/^\d{5}$/)]).default(""),
  })
  .refine((p) => p.county === "" || isCountyIn(p.county, p.state), {
    error: "Choose a county in your state, or Not set",
    path: ["county"],
  });
}

export type ProfileInput = z.output<ReturnType<typeof makeProfileSchema>>;

/** Valid form answers as database columns, ready for update(). */
export function toProfileUpdate({ nickname, stage, state, gradYear, county }: ProfileInput) {
  return {
    nickname: nickname === "" ? null : nickname,
    stage,
    state,
    // Adult learners aren't asked; clear it whatever was sent.
    grad_year: stage === "adult_learner" || gradYear === "" ? null : gradYear,
    county: county === "" ? null : county,
  };
}
