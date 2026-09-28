"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getQuestions } from "@/lib/interests/data";
import { answersSchema, QUESTION_COUNT, resultsPath, scoreAnswers, scoresParamsSchema } from "@/lib/interests/scoring";
import { createClient } from "@/lib/supabase/server";
import type { QuizState, SaveState } from "./state";

/**
 * Scores the quiz on the server and sends the student to their results.
 * Answers are never stored: only the six scores travel on, in the URL.
 */
export async function scoreQuiz(_previous: QuizState, formData: FormData): Promise<QuizState> {
  const raw = Array.from({ length: QUESTION_COUNT }, (_, i) => Number(formData.get(`q${i + 1}`)));
  const missing = raw.flatMap((value, i) => (Number.isInteger(value) && value >= 1 && value <= 5 ? [] : [i + 1]));
  const answers = answersSchema.safeParse(raw);
  if (missing.length > 0 || !answers.success) return { missing, error: null };

  const questions = await getQuestions();
  if (!questions) return { missing: [], error: "The quiz isn’t ready yet. Try again later." };

  redirect(
    resultsPath(
      scoreAnswers(
        answers.data,
        questions.map((q) => q.area),
      ),
    ),
  );
}

const scoresFrom = (formData: FormData) =>
  scoresParamsSchema.safeParse(Object.fromEntries(["r", "i", "a", "s", "e", "c"].map((k) => [k, formData.get(k)])));

/** Saves (or replaces) the signed-in student's scores. user_id comes from auth.uid(). */
export async function saveInterestResults(_previous: SaveState, formData: FormData): Promise<SaveState> {
  const scores = scoresFrom(formData);
  if (!scores.success) return { error: "These results don’t look right. Take the quiz again." };
  if (!(await getCurrentUser())) redirect(`/sign-in?next=${encodeURIComponent(resultsPath(scores.data))}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("interest_results")
    .upsert({ ...scores.data, taken_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("Saving interest results failed:", error.code);
    return { error: "We couldn’t save your results. Try again." };
  }
  revalidatePath("/interests/results");
  revalidatePath("/account");
  return { error: null };
}

/** Deletes the signed-in student's saved scores (RLS limits it to their own row). */
export async function removeInterestResults(): Promise<SaveState> {
  if (!(await getCurrentUser())) redirect("/sign-in?next=%2Faccount");
  const supabase = await createClient();
  const { error } = await supabase.from("interest_results").delete().not("user_id", "is", null);
  if (error) {
    console.error("Removing interest results failed:", error.code);
    return { error: "We couldn’t remove your results. Try again." };
  }
  revalidatePath("/interests/results");
  revalidatePath("/account");
  return { error: null };
}
