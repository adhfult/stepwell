import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AGE_BLOCK_COOKIE } from "@/lib/auth/age";
import { NotEligibleMessage } from "./messages";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  // Told "under 13" earlier in this browser session: show that again, not the form.
  const blocked = (await cookies()).get(AGE_BLOCK_COOKIE)?.value === "1";

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Create your account</h1>
      {blocked ? (
        <NotEligibleMessage />
      ) : (
        <>
          <p className="mt-4">Save careers and colleges you like, and plan your next steps.</p>
          <SignUpForm thisYear={new Date().getUTCFullYear()} />
          <p className="mt-8">
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}
