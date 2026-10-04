import Link from "next/link";
import type { ReactNode } from "react";

// Terracing from 1024px: each stop steps in 24px more (DESIGN.md "Route line").
const TERRACE = ["", "lg:ml-6", "lg:ml-12", "lg:ml-[72px]"];

/**
 * The route line on a career page (DESIGN.md "Route line"): where this career
 * sits on the path, and a link to each next step. The line draws in once.
 */
export function CareerPath({ code, title }: { code: string; title: string }) {
  const stops: { label: string; here?: boolean; body: ReactNode }[] = [
    { label: "This career", here: true, body: title },
    { label: "Colleges", body: <Link href={`/careers/${code}/colleges`}>Find colleges with programs for it</Link> },
    {
      label: "Money and experience",
      body: (
        <>
          <Link href="/scholarships">Scholarships</Link>, <Link href="/internships">internships</Link> and{" "}
          <Link href="/programs">summer programs</Link>
        </>
      ),
    },
    { label: "Your plan", body: <Link href="/plan">Lay it out year by year</Link> },
  ];

  return (
    <section aria-labelledby="path-heading" className="mt-12">
      <h2 id="path-heading" className="text-lg font-bold">
        Your path from here
      </h2>
      <ol className="mt-4">
        {stops.map((stop, i) => (
          <li key={stop.label} className={`relative pl-8 ${i < stops.length - 1 ? "pb-6" : ""} ${TERRACE[i]}`}>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 origin-top bg-primary motion-safe:animate-[route-draw_600ms_var(--ease-stone)_backwards]"
            />
            {/* From 1024px, a tread joins this step's line to the next, indented one. */}
            {i < stops.length - 1 && (
              <span aria-hidden="true" className="absolute bottom-0 left-0 hidden h-1 w-7 bg-primary lg:block" />
            )}
            <span
              aria-hidden="true"
              className={`absolute -left-[6px] top-1 size-4 border-2 ${stop.here ? "border-foreground bg-highlight" : "border-primary bg-surface"}`}
            />
            <p className="font-heading font-bold">
              <span className="sr-only">
                Step {i + 1} of {stops.length},{" "}
              </span>
              {stop.label}
              {stop.here && <span className="font-body font-normal">: you are here</span>}
            </p>
            <p>{stop.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
