import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Saved listings and plan items (part of the Data Access Layer). Row Level
 * Security limits every read to the signed-in student's own rows.
 */

/** Ids of the scholarships and colleges the student saved, for Save buttons. */
export const getMySavedIds = cache(async () => {
  const empty = { scholarships: new Set<string>(), colleges: new Set<number>() };
  if (!(await getCurrentUser())) return empty;
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_items").select("scholarship_id, unitid");
  if (error) throw new Error(`Saved lookup failed (${error.code})`);
  for (const row of data) {
    if (row.scholarship_id) empty.scholarships.add(row.scholarship_id);
    if (row.unitid) empty.colleges.add(row.unitid);
  }
  return empty;
});

/**
 * Everything on the plan page. Saved listings are joined to today's data,
 * never copied, so deadlines are live; a listing that left the source comes
 * back as `live: null` with the title saved at the time.
 */
export async function getMyPlan() {
  const supabase = await createClient();
  const [items, saved] = await Promise.all([
    supabase
      .from("plan_items")
      .select("id, title, kind, academic_year, term, due_on, done")
      .order("due_on", { nullsFirst: false })
      .order("created_at"),
    supabase.from("saved_items").select("scholarship_id, unitid, title").or("scholarship_id.not.is.null,unitid.not.is.null"),
  ]);
  if (items.error) throw new Error(`Plan failed (${items.error.code})`);
  if (saved.error) throw new Error(`Saved lookup failed (${saved.error.code})`);

  const scholarshipIds = saved.data.flatMap((s) => (s.scholarship_id ? [s.scholarship_id] : []));
  const unitids = saved.data.flatMap((s) => (s.unitid ? [s.unitid] : []));
  const [scholarships, colleges] = await Promise.all([
    scholarshipIds.length
      ? supabase
          .from("scholarships")
          .select("id, title, url, deadline_kind, deadline_date, deadline_month_day, checked_at")
          .in("id", scholarshipIds)
      : { data: [], error: null },
    unitids.length
      ? supabase.from("institutions").select("unitid, name, city, state, website").in("unitid", unitids)
      : { data: [], error: null },
  ]);
  if (scholarships.error) throw new Error(`Scholarships failed (${scholarships.error.code})`);
  if (colleges.error) throw new Error(`Colleges failed (${colleges.error.code})`);

  return {
    items: items.data,
    scholarships: saved.data.flatMap((s) =>
      s.scholarship_id
        ? [{ id: s.scholarship_id, title: s.title ?? "", live: scholarships.data.find((x) => x.id === s.scholarship_id) ?? null }]
        : [],
    ),
    colleges: saved.data.flatMap((s) =>
      s.unitid ? [{ unitid: s.unitid, title: s.title ?? "", live: colleges.data.find((x) => x.unitid === s.unitid) ?? null }] : [],
    ),
  };
}

export type Plan = Awaited<ReturnType<typeof getMyPlan>>;
export type PlanItem = Plan["items"][number];
