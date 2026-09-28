/**
 * Turns Supabase Auth errors into plain messages (DESIGN.md "Writing").
 * Students never see error codes or technical details; the codes go to the
 * server log instead (never the email address or anything personal).
 */

export type AuthErrorLike = { code?: string | null } | null | undefined;

export type SignUpOutcome =
  | { kind: "check-email" }
  | { kind: "field"; field: "email" | "password"; message: string }
  | { kind: "form"; message: string };

/**
 * A confirmation or reset link that didn't work. Expired and already-used
 * links look the same to Supabase (`otp_expired`), and scanners in school
 * email sometimes use a link up, so the advice covers both.
 */
export function describeLinkError(error: AuthErrorLike): string {
  if (error?.code === "over_request_rate_limit") {
    return "Too many tries in a short time. Wait a few minutes, then try again.";
  }
  return "This link has expired or was already used.";
}

export function describeSignUpError(error: AuthErrorLike): SignUpOutcome {
  switch (error?.code) {
    // Same answer as a new sign-up, so nobody can use the form to find out
    // whether an address already has an account.
    case "user_already_exists":
    case "email_exists":
      return { kind: "check-email" };
    case "weak_password":
      return { kind: "field", field: "password", message: "Choose a longer or less common password" };
    case "email_address_invalid":
      return { kind: "field", field: "email", message: "Enter an email address, like name@example.com" };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { kind: "form", message: "Too many tries in a short time. Wait a few minutes, then try again." };
    case "email_address_not_authorized":
      return { kind: "form", message: "Stepwell can’t send email to that address yet. Try a different address." };
    case "signup_disabled":
      return { kind: "form", message: "New accounts are paused right now. Please try again later." };
    default:
      return { kind: "form", message: "We couldn’t create your account just now. Please try again in a few minutes." };
  }
}
