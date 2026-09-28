"use server";

import { redirect } from "next/navigation";
import { getFreshUser, signedInByEmailLinkRecently } from "@/lib/auth/dal";
import { describePasswordUpdateError } from "@/lib/auth/errors";
import { newPasswordSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { SetPasswordState } from "./state";

/**
 * Sets a new password without the old one. Allowed only within 15 minutes of
 * signing in through an email link (a reset or confirmation), checked again
 * here because the page may have been open a while. Afterwards every other
 * device is signed out, so anyone who had the old password loses access.
 */
export async function setPassword(_previous: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const user = await getFreshUser();
  if (!user) redirect("/sign-in?next=%2Faccount%2Fpassword");

  if (!(await signedInByEmailLinkRecently())) {
    return {
      status: "error",
      formError: "This page only works for 15 minutes after opening a reset link. Ask for a new reset email.",
    };
  }

  const parsed = newPasswordSchema.safeParse(formText(formData, "password"));
  if (!parsed.success) return { status: "invalid", passwordError: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    const outcome = describePasswordUpdateError(error);
    if (!outcome.field) console.error("Password change failed:", error.code ?? error.status);
    return outcome.field
      ? { status: "invalid", passwordError: outcome.message }
      : { status: "error", formError: outcome.message };
  }

  // Keep this device signed in; end every other session. Their refresh tokens
  // stop working now and sensitive actions (getUser) are refused at once, but
  // an already-issued access token still opens pages until it expires (up to
  // an hour), hence "within the hour" on the success message.
  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) console.error("Signing out other devices failed:", othersError.code ?? othersError.status);

  return { status: "saved" };
}
