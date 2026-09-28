import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer: the one place that decides who is signed in. Pages,
 * layouts and Server Actions ask here instead of calling Supabase auth
 * directly (Next.js authentication guide; docs/specs/accounts-and-profile.md).
 */

export type CurrentUser = {
  id: string;
  email: string | null;
};

/**
 * The signed-in student for this request, or null when signed out.
 *
 * - getClaims() verifies the login token's signature. Never use getSession()
 *   on the server: it trusts whatever the cookie says.
 * - A valid token without a profile row counts as signed out, because a
 *   deleted account's token stays valid for up to an hour.
 * - cache() makes every call during one request share a single check.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return { id: data.claims.sub, email: data.claims.email ?? null };
});
