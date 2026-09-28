import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Pay } from "./labels";

/**
 * Career reads (part of the Data Access Layer). Reference data is public;
 * saved careers are always the session's own (Row Level Security enforces
 * the same). Database errors are thrown, so the page's error state shows.
 */

export type SearchResult = {
  onet_code: string;
  title: string;
  matched_title: string | null;
  job_zone: number | null;
  education_level: number | null;
  pay: Pay | null;
};

const PAY_COLUMNS = "annual_low, annual_median, annual_high, hourly_low, hourly_median, hourly_high, or_more";

export async function searchCareers(query: string): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_occupations", { p_query: query });
  if (error) throw new Error(`Career search failed (${error.code})`);
  if (data.length === 0) return [];

  // Median pay for the facts line: one query for all results.
  const { data: pay, error: payError } = await supabase
    .from("occupation_outlook")
    .select(`onet_code, ${PAY_COLUMNS}`)
    .in(
      "onet_code",
      data.map((r) => r.onet_code),
    );
  if (payError) throw new Error(`Career pay failed (${payError.code})`);
  const payByCode = new Map(pay.map((p) => [p.onet_code, p]));
  return data.map((r) => ({ ...r, pay: payByCode.get(r.onet_code) ?? null }));
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export type Career = NonNullable<Awaited<ReturnType<typeof getCareer>>>;

/** One career with its details, or null when the code doesn't exist. */
export const getCareer = cache(async (code: string) => {
  const supabase = await createClient();
  const { data: career, error } = await supabase
    .from("occupations")
    .select(
      "onet_code, soc_code, title, description, job_zone, education_level, education_share, onet_release, retrieved_at, retired_at",
    )
    .eq("onet_code", code)
    .maybeSingle();
  if (error) throw new Error(`Career lookup failed (${error.code})`);
  if (!career) return null;

  const [details, titles, related, outlook] = await Promise.all([
    supabase.from("occupation_details").select("tasks, skills").eq("onet_code", code).maybeSingle(),
    supabase
      .from("occupation_titles")
      .select("title")
      .eq("onet_code", code)
      .eq("kind", "reported")
      .order("featured", { ascending: false })
      .order("title")
      .limit(6),
    supabase
      .from("occupation_related")
      .select("tier, rank, related:occupations!occupation_related_related_code_fkey(onet_code, title, retired_at)")
      .eq("onet_code", code)
      .in("tier", ["primary_short", "primary_long"])
      .order("tier", { ascending: false }) // primary_short before primary_long
      .order("rank")
      .limit(12),
    supabase
      .from("occupation_outlook")
      .select(`outlook, bright_reasons, wage_soc_code, retrieved_at, ${PAY_COLUMNS}`)
      .eq("onet_code", code)
      .maybeSingle(),
  ]);
  for (const result of [details, titles, related, outlook]) {
    if (result.error) throw new Error(`Career details failed (${result.error.code})`);
  }

  return {
    ...career,
    tasks: strings(details.data?.tasks),
    skills: strings(details.data?.skills),
    alsoCalled: (titles.data ?? []).map((t) => t.title),
    outlook: outlook.data,
    related: (related.data ?? [])
      .flatMap((r) => (r.related && !r.related.retired_at ? [r.related] : []))
      .slice(0, 6),
  };
});

/** Whether the signed-in student saved this career (false when signed out). */
export async function isCareerSaved(code: string): Promise<boolean> {
  if (!(await getCurrentUser())) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_items").select("id").eq("onet_code", code).maybeSingle();
  if (error) throw new Error(`Saved check failed (${error.code})`);
  return Boolean(data);
}

/** The signed-in student's saved careers, newest first. */
export async function getMySavedCareers() {
  if (!(await getCurrentUser())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_items")
    .select("created_at, career:occupations(onet_code, title, retired_at)")
    .not("onet_code", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Saved careers failed (${error.code})`);
  return data.flatMap((row) => (row.career ? [row.career] : []));
}

/** The O*NET release and last successful import, for source lines under search results. */
export const getOnetSource = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("last_release, last_success_at")
    .eq("id", "onet")
    .maybeSingle();
  if (error) throw new Error(`Source lookup failed (${error.code})`);
  return data?.last_release && data.last_success_at
    ? { release: data.last_release, retrievedAt: data.last_success_at }
    : null;
});
