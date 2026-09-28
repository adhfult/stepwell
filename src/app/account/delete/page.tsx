import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { DeleteAccountForm } from "./delete-form";

export const metadata: Metadata = { title: "Delete your account" };

export default async function DeleteAccountPage() {
  const user = await requireUser("/account/delete");

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Delete your account</h1>
      <p className="mt-4">
        This deletes the account for <strong className="break-all">{user.email}</strong> and everything in it: your
        login and your profile. It can’t be undone.
      </p>
      <p className="mt-4">You can create a new account later if you change your mind.</p>
      <DeleteAccountForm />
      <p className="mt-8">
        <Link href="/account">Keep my account</Link>
      </p>
    </div>
  );
}
