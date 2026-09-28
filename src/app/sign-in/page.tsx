import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeNextPath((await searchParams).next, "/");

  // Already signed in: go straight on.
  if (await getCurrentUser()) redirect(next === "/" ? "/account" : next);

  return (
    <Page width="form">
      <PageTitle>Sign in</PageTitle>
      <SignInForm next={next} />
      <p className="mt-6">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p className="mt-4">
        New to Stepwell? <Link href="/sign-up">Create an account</Link>
      </p>
    </Page>
  );
}
