import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { MainNav } from "./main-nav";

// 44px tall tap targets (DESIGN.md "Spacing and shape"). Navigation links are
// the one place links aren't underlined at rest: in the header, everything
// is a link, so the underline only adds noise (underlined on hover and focus).
const navLink = "inline-flex min-h-11 items-center no-underline hover:underline focus-visible:underline";

/**
 * Site header from DESIGN.md "Page frame": the wordmark, the main sections
 * (behind "Menu" on phones), then account links.
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
        <div className="flex items-center gap-4">
          <MainNav />
          <nav aria-label="Account">
            {/* The login check waits here, so the rest of the page isn't held up. */}
            <Suspense fallback={<AccountLinksSkeleton />}>
              <AccountLinks />
            </Suspense>
          </nav>
        </div>
      </div>
    </header>
  );
}

async function AccountLinks() {
  const user = await getCurrentUser();

  if (user) {
    // Phones get "Account" only, so the header stays on one line; the account
    // page links to the plan. Both show from 640px.
    return (
      <ul className="flex items-center justify-end gap-x-4">
        <li className="hidden sm:block">
          <Link href="/plan" className={navLink}>
            My plan
          </Link>
        </li>
        <li>
          <Link href="/account" className={navLink}>
            Account
          </Link>
        </li>
      </ul>
    );
  }

  return (
    // Phones get "Sign in" only, so the header stays on one line; the sign-in
    // page links to "Create an account". Both show from 640px.
    <ul className="flex items-center justify-end gap-x-4">
      <li>
        <Link href="/sign-in" className={navLink}>
          Sign in
        </Link>
      </li>
      <li className="hidden sm:block">
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
      <span aria-hidden="true" className="hidden h-3 w-28 bg-border-subtle sm:block" />
    </div>
  );
}
