"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { CONSENT_VERSION, recordSchema } from "@/lib/gpa/record";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; message: string };

const SIGN_IN = "Sign in to save your classes and scores.";

/**
 * Saves the signed-in student's classes, weights, shortcut and scores
 * (decision 0013). user_id comes from auth.uid() in the database, never the
 * client. Grades are never logged: errors report only the database code.
 */
export async function saveAcademicRecord(input: unknown, consent: boolean): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SIGN_IN };
  if (!consent) return { ok: false, message: "Tick the box to say it’s OK to save your classes and scores." };
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your classes and scores." };

  const { courses, weights, start, sat, act } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("academic_records").upsert(
    {
      courses,
      weight_honors: weights.honors,
      weight_ap: weights.ap,
      weight_ib: weights.ib,
      weight_dual: weights.dual,
      start_unweighted: start.unweighted,
      start_weighted: start.weighted,
      start_credits: start.credits,
      sat,
      act,
      consent_version: CONSENT_VERSION,
      consented_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("Saving academic record failed:", error.code);
    return { ok: false, message: "We couldn’t save your classes. Try again." };
  }
  revalidatePath("/gpa");
  revalidatePath("/colleges", "layout");
  return { ok: true };
}

/** Deletes everything the student saved on /gpa (RLS limits it to their own row). */
export async function removeAcademicRecord(): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SIGN_IN };
  const supabase = await createClient();
  const { error } = await supabase.from("academic_records").delete().not("user_id", "is", null);
  if (error) {
    console.error("Removing academic record failed:", error.code);
    return { ok: false, message: "We couldn’t remove your classes. Try again." };
  }
  revalidatePath("/gpa");
  revalidatePath("/colleges", "layout");
  return { ok: true };
}

/**
 * "Use 3.62 for scholarship matching": updates the GPA answer of a student
 * who already opted in to eligibility answers. It never creates that row,
 * so consent stays on the eligibility page.
 */
export async function setScholarshipGpa(gpa: unknown): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SIGN_IN };
  if (typeof gpa !== "number" || !(gpa >= 0 && gpa <= 5)) return { ok: false, message: "That GPA can’t be used." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eligibility_profiles")
    .update({ gpa: Math.round(gpa * 100) / 100 })
    .not("user_id", "is", null)
    .select("user_id");
  if (error) {
    console.error("Updating eligibility GPA failed:", error.code);
    return { ok: false, message: "We couldn’t update your scholarship GPA. Try again." };
  }
  if (!data?.length) return { ok: false, message: "Answer the scholarship questions first." };
  revalidatePath("/scholarships");
  revalidatePath("/account/eligibility");
  return { ok: true };
}
