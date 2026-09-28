import Link from "next/link";
import { ResultPanel } from "@/components/form";

/**
 * Under 13 (decision 0005): kind, and never explains how to get in.
 * Shown by the form after the age check, and by the page on later visits
 * in the same browser session.
 */
export function NotEligibleMessage({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <ResultPanel title="Sorry, we can’t create an account for you" autoFocus={autoFocus}>
      <p>You can still explore careers and colleges on Stepwell without an account.</p>
    </ResultPanel>
  );
}

/**
 * Shown after every accepted sign-up, including for addresses that already
 * have an account, so the form never reveals which addresses are registered.
 */
export function CheckEmailMessage({ email }: { email: string }) {
  return (
    <ResultPanel title="Check your email" autoFocus>
      <p>
        We sent a link to <strong className="break-words">{email}</strong>. Open it to finish creating your account.
      </p>
      <p className="text-sm text-muted">
        No email after a few minutes? Check your spam or junk folder. If you already have an account with this address,{" "}
        <Link href="/sign-in">sign in</Link> instead.
      </p>
    </ResultPanel>
  );
}
