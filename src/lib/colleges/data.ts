import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Program names linked to a career in O*NET's crosswalk, by CIP code: the
 * official numbering puts a family's general program first (51.3801 is
 * Registered Nursing, before its specialties).
 */
export const getCareerPrograms = cache(async (code: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occupation_programs")
    .select("cip_title")
    .eq("onet_code", code)
    .order("cip6");
  if (error) throw new Error(`Career programs failed (${error.code})`);
  return [...new Set(data.map((r) => r.cip_title))];
});

export async function collegesForCareer(code: string, state?: string, level?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("colleges_for_career", {
    p_onet_code: code,
    ...(state ? { p_state: state } : {}),
    ...(level ? { p_level: level } : {}),
  });
  if (error) throw new Error(`Colleges failed (${error.code})`);
  return data;
}

export type CollegeProgram = Awaited<ReturnType<typeof collegesForCareer>>[number];

/** When the College Scorecard data was last loaded, for the source line. */
export const getScorecardRetrieved = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("last_success_at").eq("id", "scorecard").maybeSingle();
  if (error) throw new Error(`Source lookup failed (${error.code})`);
  return data?.last_success_at ?? null;
});
