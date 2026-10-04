import { Band, Page } from "@/components/page";

/** Skeleton shaped like the programs list; band included, no shimmer (DESIGN.md "States"). */
export default function ProgramsLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading programs</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-8 w-40 bg-border-subtle sm:h-10" />
          <div className="mt-6 h-3 w-full max-w-xl bg-border-subtle" />
          <div className="mt-8 h-11 w-full max-w-2xl bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="h-5 w-56 bg-border-subtle" />
          <div className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="py-4">
                <div className="h-5 w-64 max-w-full bg-border-subtle" />
                <div className="mt-2 h-3 w-48 bg-border-subtle" />
              </div>
            ))}
          </div>
        </Page>
      </div>
    </div>
  );
}
