import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Today in U.S. Eastern time: USAJOBS postings close at the end of their closing day there. */
export function todayEastern(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/**
 * Open internships, soonest closing first (part of the Data Access Layer).
 * A state shows postings there plus remote ones; `state` must already be a
 * checked two-letter code (the page validates it with zod).
 */
export async function listOpportunities(where: { state?: string; remoteOnly?: boolean }) {
  const supabase = await createClient();
  let query = supabase
    .from("opportunities")
    .select("id, title, organization, places, remote, pay_min, pay_max, pay_interval, who_may_apply, closes_on, summary, url, retrieved_at")
    .gte("closes_on", todayEastern())
    .order("closes_on")
    .order("title");
  if (where.remoteOnly) query = query.eq("remote", true);
  else if (where.state) query = query.or(`states.cs.{${where.state}},remote.eq.true`);
  const { data, error } = await query;
  if (error) throw new Error(`Internships failed (${error.code})`);
  return data;
}

export type Opportunity = Awaited<ReturnType<typeof listOpportunities>>[number];
