import Link from "next/link";

/** Shown for any address that doesn't exist (DESIGN.md "States"). */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">We couldn’t find that page</h1>
      <p className="mt-4">The address may have a typo, or the page may have moved.</p>
      <p className="mt-8">
        <Link href="/">Go to the home page</Link>
      </p>
    </div>
  );
}
