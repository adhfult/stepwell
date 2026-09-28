import type { Metadata } from "next";
import { SubmitButton } from "@/components/form";
import { requireUser } from "@/lib/auth/dal";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your account" };

/** The student's account. The profile summary joins this page in a later step. */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Your account</h1>
      <p className="mt-4">
        Signed in as <strong className="break-all">{user.email}</strong>.
      </p>
      <form action={signOut} className="mt-8">
        <SubmitButton variant="secondary" pendingLabel="Signing out">
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
