"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { timelinePlanItems } from "@/lib/athletes/rules";
import { getCurrentUser } from "@/lib/auth/dal";
import { todayEastern } from "@/lib/opportunities/data";
import { schoolYear } from "@/lib/plan/labels";
import { CORE_AREAS, courseSchema } from "@/lib/gpa/record";
import { getMyProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; message: string };

const tagsSchema = z
  .array(
    z.object({
      name: z.string().max(80),
      core: z.enum(CORE_AREAS).nullable(),
      year: z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]).nullable(),
    }),
  )
  .max(80);

/**
 * Tags the student's saved classes, in their saved order (decision 0014). Only
 * the courses column changes, on the signed-in student's own row. A list that
 * changed since the page loaded is refused rather than tagging the wrong class.
 */
export async function saveCoreTags(input: unknown): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to save your classes." };
  const tags = tagsSchema.safeParse(input);
  if (!tags.success) return { ok: false, message: "Check your class choices." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("academic_records").select("courses").eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("Loading classes for tags failed:", error.code);
    return { ok: false, message: "We couldn’t save that. Try again." };
  }
  if (!data) return { ok: false, message: "Save your classes on the GPA page first." };
  const courses = z.array(courseSchema).safeParse(data.courses);
  // Same count and names in the same order, or the list changed in another tab.
  if (
    !courses.success ||
    courses.data.length !== tags.data.length ||
    courses.data.some((c, i) => c.name !== tags.data[i].name)
  ) {
    return { ok: false, message: "Your classes changed since this page loaded. Reload the page and try again." };
  }
  const tagged = courses.data.map(({ core, year, ...base }, i) => {
    const t = tags.data[i];
    return { ...base, ...(t.core && { core: t.core }), ...(t.year && { year: t.year }) };
  });
  const { error: saveError } = await supabase.from("academic_records").update({ courses: tagged }).eq("user_id", user.id);
  if (saveError) {
    console.error("Saving class tags failed:", saveError.code);
    return { ok: false, message: "We couldn’t save that. Try again." };
  }
  revalidatePath("/athletes");
  revalidatePath("/gpa");
  return { ok: true };
}

const assocSchema = z.enum(["ncaa1", "ncaa2", "ncaa3", "naia", "juco"]);

/** Adds the timeline's steps for one association to /plan, once. */
export async function addTimeline(input: unknown): Promise<{ ok: true; added: number } | { ok: false; message: string }> {
  const assoc = assocSchema.safeParse(input);
  if (!assoc.success) return { ok: false, message: "Pick a level first." };
  const profile = await getMyProfile();
  if (!profile) return { ok: false, message: "Sign in to add these to your plan." };
  const inSchool = profile.stage === "high_school" || profile.stage === "middle_school";
  if (profile.stage && !inSchool) {
    return { ok: false, message: "These steps are for high school students, so they aren’t added to your plan." };
  }
  if (!inSchool || !profile.grad_year) {
    return { ok: false, message: "Add your school stage and high school graduation year in your profile first." };
  }
  const supabase = await createClient();
  const { data: existing, error } = await supabase.from("plan_items").select("title");
  if (error) {
    console.error("Reading plan for timeline failed:", error.code);
    return { ok: false, message: "We couldn’t add these. Try again." };
  }
  const rows = timelinePlanItems(assoc.data, profile.grad_year, existing.map((r) => r.title), schoolYear(todayEastern()));
  if (rows.length === 0) return { ok: true, added: 0 };
  const { error: insertError } = await supabase.from("plan_items").insert(rows);
  // 54000: the per-student cap (500 plan steps).
  if (insertError?.code === "54000") return { ok: false, message: "Your plan has the most steps we allow (500). Delete some to add these." };
  if (insertError) {
    console.error("Adding timeline failed:", insertError.code);
    return { ok: false, message: "We couldn’t add these. Try again." };
  }
  revalidatePath("/plan");
  return { ok: true, added: rows.length };
}
