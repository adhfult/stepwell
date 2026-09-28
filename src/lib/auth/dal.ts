import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
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

/**
 * For pages that need a signed-in student. Signed-out visitors go to sign-in
 * and come back to `returnTo` (this page's path) afterwards.
 */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(returnTo, "/account"))}`);
  }
  return user;
}

/**
 * For sensitive actions (deleting the account, setting a password): asks the
 * Supabase Auth server directly with getUser() instead of trusting the
 * token's claims, so a signed-out or deleted session can't slip through
 * during the up-to-an-hour a token stays valid. Not cached: always fresh.
 */
export async function getFreshUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** How long after opening an email link a student may set a password without the old one. */
export const EMAIL_LINK_WINDOW_SECONDS = 15 * 60;

/**
 * Whether this session came from an email link (a password reset or email
 * confirmation) within the last 15 minutes. Supabase records how a session
 * started in the token's `amr` claim: "otp" for email links, "password" for
 * a normal sign-in. Setting a password without the old one is allowed only
 * then, so someone at a shared computer where a student is still signed in
 * can't take over the account; they'd need the student's inbox.
 */
export async function signedInByEmailLinkRecently(now = Date.now()): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const amr = data?.claims.amr;
  if (!Array.isArray(amr)) return false;
  const nowSeconds = Math.floor(now / 1000);
  return amr.some(
    (entry) =>
      typeof entry === "object" &&
      entry.method === "otp" &&
      nowSeconds - entry.timestamp >= 0 &&
      nowSeconds - entry.timestamp <= EMAIL_LINK_WINDOW_SECONDS,
  );
}
