import Link from "next/link";
import { Page, PageTitle } from "@/components/page";

/** Shown for any address that doesn't exist (DESIGN.md "States"). */
export default function NotFound() {
  return (
    <Page>
      <PageTitle>We couldn’t find that page</PageTitle>
      <p className="mt-4">The address may have a typo, or the page may have moved.</p>
      <p className="mt-8">
        <Link href="/">Go to the home page</Link>
      </p>
    </Page>
  );
}
