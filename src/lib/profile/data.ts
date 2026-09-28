import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Profile reads and writes for the signed-in student (part of the Data Access
 * Layer). Always scoped to the session's user, never an id from the browser;
 * Row Level Security enforces the same rule in the database.
 */

export type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "nickname" | "stage" | "state" | "grad_year">;
export type ProfileUpdate = Pick<Database["public"]["Tables"]["profiles"]["Update"], "nickname" | "stage" | "state" | "grad_year">;

/** The signed-in student's profile, or null when signed out. */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("nickname, stage, state, grad_year")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

/** Profile complete = stage and state set (spec). A type guard, so callers know it's not null. */
export function isProfileComplete(profile: Profile | null): profile is Profile & { stage: string; state: string } {
  return Boolean(profile?.stage && profile?.state);
}

/**
 * Saves the signed-in student's profile. Returns false if nothing was saved
 * (signed out, database error, or no row), so the caller can say so.
 * update(), never upsert: rows are created only by the sign-up trigger.
 */
export async function updateMyProfile(changes: ProfileUpdate): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(changes).eq("id", user.id).select("id");
  if (error) console.error("Profile update failed:", error.code);
  return !error && data.length === 1;
}
