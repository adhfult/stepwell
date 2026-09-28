import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AGE_BLOCK_COOKIE } from "@/lib/auth/age";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { NotEligibleMessage } from "./messages";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  // Already signed in: nothing to sign up for.
  if (await getCurrentUser()) redirect("/account");

  // Told "under 13" earlier in this browser session: show that again, not the form.
  const blocked = (await cookies()).get(AGE_BLOCK_COOKIE)?.value === "1";

  return (
    <Page width="form">
      <PageTitle>Create your account</PageTitle>
      {blocked ? <NotEligibleMessage /> : <SignUpForm thisYear={new Date().getUTCFullYear()} />}
    </Page>
  );
}
