import Link from "next/link";
import { Page, PageTitle } from "@/components/page";

/** Shown for any address that doesn't exist (DESIGN.md "States"). */
export default function NotFound() {
  return (
    <Page>
      <PageTitle>We couldn’t find that page</PageTitle>
      <p className="mt-4">The address may have a typo, or the page may have moved.</p>
      <ul className="mt-8 space-y-1">
        <li>
          <Link href="/" className="inline-flex min-h-11 items-center">
            Go to the home page
          </Link>
        </li>
        <li>
          <Link href="/careers" className="inline-flex min-h-11 items-center">
            Search careers
          </Link>
        </li>
      </ul>
    </Page>
  );
}
