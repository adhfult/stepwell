import { Band, Page } from "@/components/page";

/** Skeleton shaped like the GPA page: band, class list, two key numbers (DESIGN.md "States"). */
export default function GpaLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading the GPA tool</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-8 w-64 max-w-full bg-border-subtle sm:h-10" />
          <div className="mt-6 h-3 w-full max-w-xl bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="h-5 w-32 bg-border-subtle" />
          <div className="mt-4 h-3 w-full max-w-2xl bg-border-subtle" />
          <div className="mt-6 h-14 bg-border-subtle" />
          <div className="mt-6 h-11 w-32 bg-border-subtle" />
          <div className="mt-12 h-5 w-24 bg-border-subtle" />
          <div className="mt-4 grid max-w-md grid-cols-2 gap-6">
            <div className="h-12 bg-border-subtle" />
            <div className="h-12 bg-border-subtle" />
          </div>
        </Page>
      </div>
    </div>
  );
}
