import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { withPay } from "@/lib/careers/data";
import { createClient } from "@/lib/supabase/server";
import { AREAS, QUESTION_COUNT, type Area, type Scores } from "./scoring";

/**
 * Interest quiz reads (part of the Data Access Layer). Questions and matching
 * are public; saved results are always the session's own (RLS agrees).
 */

export type Question = { index: number; area: Area; text: string };

/** All 60 questions in order, or null if they haven't been imported yet. */
export const getQuestions = cache(async (): Promise<Question[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("interest_questions").select("index, area, text").order("index");
  if (error) throw new Error(`Questions failed (${error.code})`);
  const questions = data.filter((q): q is Question => (AREAS as readonly string[]).includes(q.area));
  return questions.length === QUESTION_COUNT ? questions : null;
});

export async function matchCareers(scores: Scores, zone: number | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_careers", {
    p_realistic: scores.realistic,
    p_investigative: scores.investigative,
    p_artistic: scores.artistic,
    p_social: scores.social,
    p_enterprising: scores.enterprising,
    p_conventional: scores.conventional,
    ...(zone ? { p_zone: zone } : {}),
  });
  if (error) throw new Error(`Career matching failed (${error.code})`);
  return withPay(data);
}

/** The signed-in student's saved scores, or null. */
export async function getMyInterestResults(): Promise<(Scores & { taken_at: string }) | null> {
  if (!(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interest_results")
    .select("realistic, investigative, artistic, social, enterprising, conventional, taken_at")
    .maybeSingle();
  if (error) throw new Error(`Saved interests failed (${error.code})`);
  return data;
}
