/** Skeleton shaped like the colleges list; no shimmer (DESIGN.md "States"). */
export default function CollegesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:py-12 lg:px-8 lg:py-16" aria-busy="true">
      <p className="sr-only">Loading colleges</p>
      <div aria-hidden="true">
        <div className="h-3 w-40 bg-border-subtle" />
        <div className="mt-6 h-8 w-80 max-w-full bg-border-subtle sm:h-10" />
        <div className="mt-8 h-11 w-full max-w-2xl bg-border-subtle" />
        <div className="mt-12 divide-y divide-border-subtle border-y border-border-subtle">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="py-4">
              <div className="h-5 w-64 max-w-full bg-border-subtle" />
              <div className="mt-2 h-3 w-56 bg-border-subtle" />
              <div className="mt-2 h-3 w-72 max-w-full bg-border-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
