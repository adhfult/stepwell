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
  const ids = { scholarships: new Set<string>(), colleges: new Set<number>(), internships: new Set<string>(), ap: new Set<string>(), programs: new Set<string>() };
  if (!(await getCurrentUser())) return ids;
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_items").select("scholarship_id, unitid, opportunity_id, ap_course_code, student_program_id");
  if (error) throw new Error(`Saved lookup failed (${error.code})`);
  for (const row of data) {
    if (row.scholarship_id) ids.scholarships.add(row.scholarship_id);
    if (row.unitid) ids.colleges.add(row.unitid);
    if (row.opportunity_id) ids.internships.add(row.opportunity_id);
    if (row.ap_course_code) ids.ap.add(row.ap_course_code);
    if (row.student_program_id) ids.programs.add(row.student_program_id);
  }
  return ids;
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
    supabase
      .from("saved_items")
      .select("scholarship_id, unitid, opportunity_id, ap_course_code, student_program_id, title")
      .is("onet_code", null),
  ]);
  if (items.error) throw new Error(`Plan failed (${items.error.code})`);
  if (saved.error) throw new Error(`Saved lookup failed (${saved.error.code})`);

  const scholarshipIds = saved.data.flatMap((s) => (s.scholarship_id ? [s.scholarship_id] : []));
  const unitids = saved.data.flatMap((s) => (s.unitid ? [s.unitid] : []));
  const postingIds = saved.data.flatMap((s) => (s.opportunity_id ? [s.opportunity_id] : []));
  const apCodes = saved.data.flatMap((s) => (s.ap_course_code ? [s.ap_course_code] : []));
  const programIds = saved.data.flatMap((s) => (s.student_program_id ? [s.student_program_id] : []));
  const [scholarships, colleges, internships, apCourses, programs] = await Promise.all([
    scholarshipIds.length
      ? supabase
          .from("scholarships")
          .select("id, title, url, deadline_kind, deadline_date, deadline_month_day, checked_at")
          .in("id", scholarshipIds)
      : { data: [], error: null },
    unitids.length
      ? supabase.from("institutions").select("unitid, name, city, state, website").in("unitid", unitids)
      : { data: [], error: null },
    postingIds.length
      ? supabase.from("opportunities").select("id, title, organization, closes_on, url").in("id", postingIds)
      : { data: [], error: null },
    apCodes.length ? supabase.from("ap_courses").select("code, name").in("code", apCodes) : { data: [], error: null },
    programIds.length
      ? supabase
          .from("student_programs")
          .select("id, title, url, sponsor, deadline_kind, deadline_date, deadline_month_day, checked_at")
          .in("id", programIds)
      : { data: [], error: null },
  ]);
  if (scholarships.error) throw new Error(`Scholarships failed (${scholarships.error.code})`);
  if (colleges.error) throw new Error(`Colleges failed (${colleges.error.code})`);
  if (internships.error) throw new Error(`Internships failed (${internships.error.code})`);
  if (apCourses.error) throw new Error(`AP classes failed (${apCourses.error.code})`);
  if (programs.error) throw new Error(`Programs failed (${programs.error.code})`);

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
    internships: saved.data.flatMap((s) =>
      s.opportunity_id
        ? [{ id: s.opportunity_id, title: s.title ?? "", live: internships.data.find((x) => x.id === s.opportunity_id) ?? null }]
        : [],
    ),
    apCourses: apCourses.data,
    programs: saved.data.flatMap((s) =>
      s.student_program_id
        ? [{ id: s.student_program_id, title: s.title ?? "", live: programs.data.find((x) => x.id === s.student_program_id) ?? null }]
        : [],
    ),
  };
}

export type Plan = Awaited<ReturnType<typeof getMyPlan>>;
export type PlanItem = Plan["items"][number];
