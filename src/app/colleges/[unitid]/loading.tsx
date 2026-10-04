import { Band, Page } from "@/components/page";

/** Skeleton shaped like a college page; band included, no shimmer (DESIGN.md "States"). */
export default function CollegeLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading college</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-3 w-24 bg-border-subtle" />
          <div className="mt-4 h-8 w-72 max-w-full bg-border-subtle sm:h-10" />
          <div className="mt-6 h-3 w-32 bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="max-w-2xl">
            <div className="h-5 w-24 bg-border-subtle" />
            <div className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-[7.5rem_1fr] gap-x-4 py-3 sm:grid-cols-3">
                  <div className="h-3 w-20 bg-border-subtle" />
                  <div className="h-3 w-40 bg-border-subtle" />
                </div>
              ))}
            </div>
          </div>
        </Page>
      </div>
    </div>
  );
}
