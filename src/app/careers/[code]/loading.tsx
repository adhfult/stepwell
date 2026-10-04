import { Band, Page } from "@/components/page";

/** Skeleton shaped like a career page, band included; no shimmer (DESIGN.md "States"). */
export default function CareerLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading career</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-3 w-28 bg-border-subtle" />
          <div className="mt-6 h-8 w-72 max-w-full bg-border-subtle sm:h-10" />
          <div className="mt-4 h-3 w-96 max-w-full bg-border-subtle" />
          <div className="mt-8 h-7 w-48 bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="max-w-2xl">
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full bg-border-subtle" />
              <div className="h-3 w-full bg-border-subtle" />
              <div className="h-3 w-2/3 bg-border-subtle" />
            </div>
            <div className="mt-8 h-11 w-36 bg-border-subtle" />
            <div className="mt-12 h-5 w-32 bg-border-subtle" />
            <div className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {[0, 1].map((row) => (
                <div key={row} className="py-4">
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
