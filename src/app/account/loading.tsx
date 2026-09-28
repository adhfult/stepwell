/** Skeleton shaped like the account page; no shimmer (DESIGN.md "States"). */
export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16" aria-busy="true">
      <p className="sr-only">Loading your account</p>
      <div aria-hidden="true">
        <div className="h-8 w-56 bg-border-subtle sm:h-10" />
        <div className="mt-6 h-3 w-72 max-w-full bg-border-subtle" />
        <div className="mt-10 h-11 w-28 bg-border-subtle" />
      </div>
    </div>
  );
}
