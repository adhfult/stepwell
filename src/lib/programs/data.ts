import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Official student programs (part of the Data Access Layer). A state shows its
 * programs plus national ones (no states listed); `state` and `stage` must
 * already be checked values (the page validates them with zod).
 */
export async function listPrograms(where: { state?: string; stage?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("student_programs")
    .select("id, title, sponsor, kind, url, stages, states, remote, paid, pay_text, deadline_kind, deadline_date, deadline_month_day, who_text, description, checked_at")
    .order("title");
  if (where.state) query = query.or(`states.cs.{${where.state}},states.eq.{}`);
  if (where.stage) query = query.contains("stages", [where.stage]);
  const { data, error } = await query;
  if (error) throw new Error(`Programs failed (${error.code})`);
  return data;
}

export type StudentProgram = Awaited<ReturnType<typeof listPrograms>>[number];

/** Youth job programs (CareerOneStop youth service providers) in one state, by city. */
export async function listYouthPrograms(state: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("youth_programs")
    .select("id, name, city, website")
    .eq("state", state)
    .order("city")
    .order("name");
  if (error) throw new Error(`Youth programs failed (${error.code})`);
  return data;
}
