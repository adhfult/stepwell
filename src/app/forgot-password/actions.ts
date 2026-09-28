"use server";

import { emailSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { ForgotPasswordState } from "./state";

/**
 * Sends a password reset email. The answer is the same for every address,
 * so this form can't be used to find out who has an account. That includes
 * Supabase's "you just asked, wait a minute" error, which it only gives for
 * existing accounts; only the per-connection rate limit is shown.
 */
export async function requestPasswordReset(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const typed = formText(formData, "email");
  const parsed = emailSchema.safeParse(typed);
  if (!parsed.success) {
    return { status: "invalid", email: typed, emailError: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);

  if (error) {
    if (error.code === "over_request_rate_limit") {
      return { status: "error", email: typed, formError: "Too many tries in a short time. Wait a few minutes, then try again." };
    }
    // The code only: never the email address.
    console.error("Password reset request failed:", error.code ?? error.status);
  }

  return { status: "sent", email: parsed.data };
}
