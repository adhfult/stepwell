import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted" };

/** Where a student lands after deleting their account. Needs no sign-in. */
export default function AccountDeletedPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Your account is deleted</h1>
      <p className="mt-4">We removed your login and your profile. Thanks for trying Stepwell.</p>
      <p className="mt-8">
        <Link href="/">Go to the home page</Link>
      </p>
    </div>
  );
}
