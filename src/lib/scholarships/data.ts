import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Scholarship reads (part of the Data Access Layer). Matching runs in the
 * database as the signed-in student (RLS), so eligibility answers never pass
 * through app code; the page only sees match levels and what to check.
 */

export async function matchScholarships(state?: string, stage?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_scholarships", {
    ...(state ? { p_state: state } : {}),
    ...(stage ? { p_stage: stage } : {}),
  });
  if (error) throw new Error(`Scholarships failed (${error.code})`);
  return data;
}

export type ScholarshipMatch = Awaited<ReturnType<typeof matchScholarships>>[number];

/**
 * The signed-in student's eligibility answers, for their own form only.
 * Never logged; errors report only the database code.
 */
export const getMyEligibility = cache(async () => {
  if (!(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eligibility_profiles")
    .select("gpa, intended_fields, first_generation, citizenship, military_family, plans_fafsa, consent_version, updated_at")
    .maybeSingle();
  if (error) throw new Error(`Eligibility lookup failed (${error.code})`);
  return data;
});

/** 2-digit CIP families of a career's programs that some scholarship names. */
export const getScholarshipFieldsForCareer = cache(async (code: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data: programs, error } = await supabase.from("occupation_programs").select("cip6").eq("onet_code", code);
  if (error) throw new Error(`Career fields failed (${error.code})`);
  const families = [...new Set(programs.map((p) => p.cip6.slice(0, 2)))];
  if (families.length === 0) return [];
  const { data: listings, error: listError } = await supabase.from("scholarships").select("fields").overlaps("fields", families);
  if (listError) throw new Error(`Scholarship fields failed (${listError.code})`);
  const named = new Set(listings.flatMap((l) => l.fields));
  return families.filter((f) => named.has(f));
});
