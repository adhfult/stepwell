import Link from "next/link";

/**
 * DESIGN.md "Page frame" footer: on surface, a top divider, links to Terms,
 * Privacy, About the data (Contact joins when it exists), and one line
 * naming the government sources.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
        <ul className="flex flex-wrap gap-x-6">
          <li>
            <Link href="/about-data" className="inline-flex min-h-11 items-center">
              About the data
            </Link>
          </li>
          <li>
            <Link href="/terms" className="inline-flex min-h-11 items-center">
              Terms
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="inline-flex min-h-11 items-center">
              Privacy
            </Link>
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Data from the U.S. Department of Labor (O*NET), the U.S. Department of Education (College Scorecard), USAJOBS
          (U.S. Office of Personnel Management) and official state and federal program pages. Free, with no ads and no
          tracking.
        </p>
      </div>
    </footer>
  );
}
