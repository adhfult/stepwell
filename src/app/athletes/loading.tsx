import { Band, Page } from "@/components/page";

/** Skeleton shaped like the athletes page: band with the level picker, rules, classes (DESIGN.md "States"). */
export default function AthletesLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading the athletes page</p>
      <div aria-hidden="true">
        <Band>
          <div className="h-8 w-80 max-w-full bg-border-subtle sm:h-10" />
          <div className="mt-6 h-3 w-full max-w-xl bg-border-subtle" />
          <div className="mt-6 h-11 w-full max-w-md bg-border-subtle" />
        </Band>
        <Page width="browse">
          <div className="h-5 w-56 bg-border-subtle" />
          <div className="mt-4 h-3 w-full max-w-2xl bg-border-subtle" />
          <div className="mt-2 h-3 w-full max-w-2xl bg-border-subtle" />
          <div className="mt-12 h-5 w-32 bg-border-subtle" />
          <div className="mt-6 h-14 max-w-2xl bg-border-subtle" />
          <div className="mt-4 h-14 max-w-2xl bg-border-subtle" />
        </Page>
      </div>
    </div>
  );
}
