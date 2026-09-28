import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
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
    <Page width="form">
      <PageTitle>Choose a new password</PageTitle>
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
    </Page>
  );
}
