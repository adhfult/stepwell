/**
 * The kinds of email link that land on /auth/confirm, with their wording and
 * where they lead afterwards (the email templates also set `next`, which is
 * checked by safeNextPath). Recovery is used by the password reset (step 12).
 */
export const linkKinds = {
  email: {
    title: "Confirm your email",
    intro: "Press the button to finish creating your Stepwell account.",
    button: "Confirm my email",
    pending: "Confirming",
    next: "/account/profile",
  },
  recovery: {
    title: "Reset your password",
    intro: "Press the button to continue to choosing a new password.",
    button: "Continue",
    pending: "Checking",
    next: "/account/password",
  },
} as const;

export type LinkKind = keyof typeof linkKinds;

export function isLinkKind(value: unknown): value is LinkKind {
  return value === "email" || value === "recovery";
}
