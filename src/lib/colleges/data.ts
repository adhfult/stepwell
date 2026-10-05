import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Directory } from "./labels";

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

/** One page of /colleges (24 rows; each carries the total). */
export async function searchColleges(f: Directory) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_colleges", {
    p_name: f.q,
    p_program: f.program,
    p_state: f.state,
    p_ownership: f.type,
    p_size: f.size,
    p_bracket: f.bracket ? Number(f.bracket) : undefined,
    p_max_price: f.max,
    p_admit: f.admit,
    p_test_optional: f.optional ? true : undefined,
    p_locale: f.setting,
    p_two_year: f.years ? f.years === "2" : undefined,
    p_serves: f.serves,
    p_sort: f.sort,
    p_page: f.page,
    p_sport: f.sport,
    p_team: f.team,
    p_level: f.level,
  });
  if (error) throw new Error(`College search failed (${error.code})`);
  return data;
}

export type DirectoryRow = Awaited<ReturnType<typeof searchColleges>>[number];

export const getCollege = cache(async (unitid: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("institutions").select("*").eq("unitid", unitid).maybeSingle();
  if (error) throw new Error(`College failed (${error.code})`);
  return data;
});

export const getCollegePrograms = cache(async (unitid: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, title, credential_level, credential_title, earnings_4yr, earnings_1yr, median_debt")
    .eq("unitid", unitid)
    .order("credential_level")
    .order("title");
  if (error) throw new Error(`College programs failed (${error.code})`);
  return data;
});

/** When the College Scorecard data was last loaded, for the source line. */
export const getScorecardRetrieved = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("last_success_at").eq("id", "scorecard").maybeSingle();
  if (error) throw new Error(`Source lookup failed (${error.code})`);
  return data?.last_success_at ?? null;
});

export const getCollegeSports = cache(async (unitid: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("college_sports").select("sport, men, women").eq("unitid", unitid).order("sport");
  if (error) throw new Error(`College sports failed (${error.code})`);
  return data;
});

/** The EADA season loaded last ("2024-25"), for the source line. */
export const getEadaSeason = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("last_release").eq("id", "eada").maybeSingle();
  if (error) throw new Error(`Source lookup failed (${error.code})`);
  return data?.last_release ?? null;
});
