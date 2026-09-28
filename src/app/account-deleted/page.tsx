import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";

export const metadata: Metadata = { title: "Account deleted" };

/** Where a student lands after deleting their account. Needs no sign-in. */
export default function AccountDeletedPage() {
  return (
    <Page width="form">
      <PageTitle>Your account is deleted</PageTitle>
      <p className="mt-4">We removed your login and your profile. Thanks for trying Stepwell.</p>
      <p className="mt-8">
        <Link href="/">Go to the home page</Link>
      </p>
    </Page>
  );
}
