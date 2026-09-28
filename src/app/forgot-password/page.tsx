import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

/** Open to everyone: signed-in students use it to change their password too. */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Reset your password</h1>
      <p className="mt-4">
        Enter the email address for your Stepwell account. We’ll send a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-8">
        Remembered it? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
