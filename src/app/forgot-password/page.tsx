import type { Metadata } from "next";
import { Page, PageTitle } from "@/components/page";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

/** Open to everyone: signed-in students use it to change their password too. */
export default function ForgotPasswordPage() {
  return (
    <Page width="form">
      <PageTitle>Reset your password</PageTitle>
      <ForgotPasswordForm />
    </Page>
  );
}
