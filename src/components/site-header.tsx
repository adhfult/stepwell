import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";

// 44px tall tap targets (DESIGN.md "Spacing and shape").
const navLink = "inline-flex min-h-11 items-center";

/**
 * Site header from DESIGN.md "Page frame": the wordmark, then account links.
 * Main section links (Careers, Colleges, ...) and the phone "Menu" button come
 * with the pages they point to, so there are never links to missing pages.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border-subtle">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-heading text-lg font-bold text-foreground no-underline"
        >
          Stepwell
        </Link>
        <nav aria-label="Account">
          {/* The login check waits here, so the rest of the page isn't held up. */}
          <Suspense fallback={<AccountLinksSkeleton />}>
            <AccountLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function AccountLinks() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Link href="/account" className={navLink}>
        Account
      </Link>
    );
  }

  return (
    // Wraps instead of overflowing on the narrowest phones (320px leaves ~1px spare).
    <ul className="flex flex-wrap items-center justify-end gap-x-4">
      <li>
        <Link href="/sign-in" className={navLink}>
          Sign in
        </Link>
      </li>
      <li>
        <Link href="/sign-up" className={navLink}>
          Create account
        </Link>
      </li>
    </ul>
  );
}

/** Same shape as the signed-out links; no shimmer (DESIGN.md "States"). */
function AccountLinksSkeleton() {
  return (
    <div className="flex min-h-11 items-center gap-4" aria-busy="true">
      <span className="sr-only">Loading account links</span>
      <span aria-hidden="true" className="h-3 w-14 bg-border-subtle" />
      <span aria-hidden="true" className="h-3 w-28 bg-border-subtle" />
    </div>
  );
}
