/** Skeleton shaped like a career page; no shimmer (DESIGN.md "States"). */
export default function CareerLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 sm:py-12 lg:px-8 lg:py-16" aria-busy="true">
      <p className="sr-only">Loading career</p>
      <div aria-hidden="true">
        <div className="h-3 w-28 bg-border-subtle" />
        <div className="mt-6 h-8 w-72 max-w-full bg-border-subtle sm:h-10" />
        <div className="mt-8 space-y-2">
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
    </div>
  );
}
