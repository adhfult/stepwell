import { Band, Page } from "@/components/page";

/** Skeleton shaped like the colleges list; band included, no shimmer (DESIGN.md "States"). */
export default function CollegesLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading colleges</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-8 w-40 bg-border-subtle sm:h-10" />
          <div className="mt-6 h-3 w-full max-w-xl bg-border-subtle" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((f) => (
              <div key={f} className="h-11 bg-border-subtle" />
            ))}
          </div>
        </Band>
        <Page width="browse">
          <div className="h-5 w-40 bg-border-subtle" />
          <div className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="py-5">
                <div className="h-5 w-64 max-w-full bg-border-subtle" />
                <div className="mt-2 h-3 w-48 bg-border-subtle" />
                <div className="mt-4 grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-3">
                  {[0, 1, 2].map((m) => (
                    <div key={m} className="h-8 bg-border-subtle" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Page>
      </div>
    </div>
  );
}
