import { Band, Page } from "@/components/page";

/** Skeleton shaped like the colleges list; band included, no shimmer (DESIGN.md "States"). */
export default function CollegesLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading colleges</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-3 w-40 bg-border-subtle" />
          <div className="mt-6 h-8 w-80 max-w-full bg-border-subtle sm:h-10" />
          <div className="mt-8 h-11 w-full max-w-2xl bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="divide-y divide-border-subtle border-y border-border-subtle">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="py-4">
                <div className="h-5 w-64 max-w-full bg-border-subtle" />
                <div className="mt-2 h-3 w-56 bg-border-subtle" />
                <div className="mt-2 h-3 w-72 max-w-full bg-border-subtle" />
              </div>
            ))}
          </div>
        </Page>
      </div>
    </div>
  );
}
