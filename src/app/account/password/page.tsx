import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-styles";
import { ResultPanel } from "@/components/form";
import { requireUser, signedInByEmailLinkRecently } from "@/lib/auth/dal";
import { SetPasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/** Where password reset links land (after the button on /auth/confirm). */
export default async function SetPasswordPage() {
  await requireUser("/account/password");
  const allowed = await signedInByEmailLinkRecently();

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Choose a new password</h1>
      {allowed ? (
        <SetPasswordForm />
      ) : (
        <ResultPanel title="Open a reset link first">
          <p>
            For your safety, you can choose a new password only in the 15 minutes after opening a password reset email.
          </p>
          <p>
            <Link href="/forgot-password" className={buttonClass()}>
              Send me a reset link
            </Link>
          </p>
        </ResultPanel>
      )}
      <p className="mt-8">
        <Link href="/account">Back to your account</Link>
      </p>
    </div>
  );
}
