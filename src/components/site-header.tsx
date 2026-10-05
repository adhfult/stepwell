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
          className="inline-flex min-h-11 items-center gap-2 font-heading text-lg font-bold text-foreground no-underline"
        >
          {/* The mark: three stone steps going down (DESIGN.md "Page frame"). */}
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" className="fill-primary">
            <rect x="0" y="2" width="8" height="4" />
            <rect x="6" y="8" width="8" height="4" />
            <rect x="12" y="14" width="8" height="4" />
          </svg>
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
    return (
      <Link href="/account" className={navLink}>
        Account
      </Link>
    );
  }

  return (
    // Phones, and from 1024px where the nine main links sit inline, get "Sign in"
    // only, so the header stays on one line; the sign-in page links to "Create
    // an account". Both show from 640px to 1023px.
    <ul className="flex items-center justify-end gap-x-4">
      <li>
        <Link href="/sign-in" className={navLink}>
          Sign in
        </Link>
      </li>
      <li className="hidden sm:block lg:hidden">
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
      <span aria-hidden="true" className="hidden h-3 w-28 bg-border-subtle sm:block lg:hidden" />
    </div>
  );
}
