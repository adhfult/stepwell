import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { type AcademicRecord, fromRow } from "./record";

/** The signed-in student's saved classes and scores, or null (signed out or nothing saved). RLS limits it to their row. */
export const getMyAcademicRecord = cache(async (): Promise<(AcademicRecord & { consentVersion: number }) | null> => {
  if (!(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("academic_records").select("*").maybeSingle();
  if (error) throw new Error(`Academic record lookup failed (${error.code})`);
  return data ? { ...fromRow(data), consentVersion: data.consent_version } : null;
});

/** Saved SAT and ACT for the college pages; nothing when signed out. */
export async function getMyScores(): Promise<{ sat?: number; act?: number }> {
  const record = await getMyAcademicRecord();
  return { sat: record?.sat ?? undefined, act: record?.act ?? undefined };
}
