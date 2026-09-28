import Link from "next/link";
import { ResultPanel } from "@/components/form";

/**
 * Under 13 (decision 0005): kind, and never explains how to get in.
 * Shown by the form after the age check, and by the page on later visits
 * in the same browser session.
 */
export function NotEligibleMessage() {
  return (
    <ResultPanel title="Sorry, we can’t create an account for you">
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
    <ResultPanel title="Check your email">
      <p>
        We sent a link to <strong className="break-all">{email}</strong>. Open it to finish creating your account.
      </p>
      <p className="text-sm text-muted">
        No email after a few minutes? Check your spam or junk folder. If you already have an account with this
        address, <Link href="/sign-in">sign in</Link> instead.
      </p>
    </ResultPanel>
  );
}
