"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { CONSENT_VERSION, eligibilitySchema } from "@/lib/scholarships/labels";
import { createClient } from "@/lib/supabase/server";
import type { EligibilityState } from "./state";

/**
 * Saves the signed-in student's answers (decision 0006). user_id comes from
 * auth.uid() in the database, never the form. Answers are never logged:
 * errors report only the database code.
 */
export async function saveEligibility(_previous: EligibilityState, formData: FormData): Promise<EligibilityState> {
  if (!(await getCurrentUser())) redirect("/sign-in?next=%2Faccount%2Feligibility");

  const parsed = eligibilitySchema.safeParse({
    gpa: formData.get("gpa"),
    fields: formData.getAll("fields"),
    first_generation: formData.get("first_generation"),
    citizenship: formData.get("citizenship"),
    military_family: formData.get("military_family"),
    plans_fafsa: formData.get("plans_fafsa"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors, saved: false, removed: false };
  }

  const a = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("eligibility_profiles").upsert(
    {
      gpa: a.gpa ?? null,
      intended_fields: a.fields,
      first_generation: a.first_generation ?? null,
      citizenship: a.citizenship ?? null,
      military_family: a.military_family ?? null,
      plans_fafsa: a.plans_fafsa ?? null,
      consent_version: CONSENT_VERSION,
      consented_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("Saving eligibility answers failed:", error.code);
    return { errors: { form: "We couldn’t save your answers. Try again." }, saved: false, removed: false };
  }
  revalidatePath("/scholarships");
  revalidatePath("/account");
  return { errors: {}, saved: true, removed: false };
}

/** Deletes all of the student's answers (RLS limits it to their own row). */
export async function removeEligibility(): Promise<EligibilityState> {
  if (!(await getCurrentUser())) redirect("/sign-in?next=%2Faccount%2Feligibility");
  const supabase = await createClient();
  const { error } = await supabase.from("eligibility_profiles").delete().not("user_id", "is", null);
  if (error) {
    console.error("Removing eligibility answers failed:", error.code);
    return { errors: { form: "We couldn’t remove your answers. Try again." }, saved: false, removed: false };
  }
  revalidatePath("/scholarships");
  revalidatePath("/account");
  return { errors: {}, saved: false, removed: true };
}
