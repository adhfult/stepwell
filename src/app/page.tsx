import Link from "next/link";
import type { ReactNode } from "react";
import { Page, PageTitle } from "@/components/page";
import { CareerSearchForm } from "./careers/search-form";

// The route line (DESIGN.md "Route line"): the real path through Stepwell,
// each stop with a real screenshot of that step (public/screenshots/, taken at
// 390px on a production build with a test account).
const STOPS: { title: string; text: string; links: { href: string; label: string }[]; shot: string; alt: string }[] = [
  {
    title: "Careers",
    text: "See what the work is, what it pays, what training it takes, and the AP classes that help.",
    links: [
      { href: "/careers", label: "Search careers" },
      { href: "/interests", label: "Take the interest quiz" },
    ],
    shot: "/screenshots/career.png",
    alt: "The pay and outlook section of the registered nurses page: median pay of $97,550 a year and a bright outlook, with its source.",
  },
  {
    title: "Programs and colleges",
    text: "From any career, find the college programs that lead there, with cost, graduation rate and what graduates earn.",
    links: [{ href: "/careers", label: "Start from a career" }],
    shot: "/screenshots/colleges.png",
    alt: "Nursing programs at Ohio colleges, each with graduates' earnings, loan debt, net price and graduation rate.",
  },
  {
    title: "Money and experience",
    text: "Scholarships and grants from official state and federal programs, paid federal internships, and free or paid summer programs.",
    links: [
      { href: "/scholarships", label: "Find scholarships" },
      { href: "/internships", label: "Find internships" },
      { href: "/programs", label: "Find summer programs" },
    ],
    shot: "/screenshots/scholarships.png",
    alt: "Scholarships for Ohio high school students, with award amounts, deadlines and links to apply on the official sites.",
  },
  {
    title: "Your plan",
    text: "Save what fits and lay it out year by year, next to the real deadlines.",
    links: [{ href: "/plan", label: "Start your plan" }],
    shot: "/screenshots/plan.png",
    alt: "A student's plan open at 11th grade, starting with Take AP Biology and a button to mark it done.",
  },
];

// Terracing from 1024px: each stop steps in 24px more (DESIGN.md), at most 72px.
const TERRACE = ["", "lg:ml-6", "lg:ml-12", "lg:ml-[72px]"];

export default function Home() {
  return (
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle>Find a career, then the path to it</PageTitle>
        <p className="mt-4">
          Stepwell shows what a career pays and takes, which college programs lead there, and the scholarships,
          internships and summer programs that help you get started. It uses official U.S. government data, and
          it’s free, with no ads.
        </p>
        <CareerSearchForm />
        <p className="mt-6">
          Not sure what you like? <Link href="/interests">Take the interest quiz</Link> and see careers that fit you.
        </p>
      </div>

      <section aria-labelledby="path-heading" className="mt-16">
        <h2 id="path-heading" className="text-lg font-bold">
          The path, one step at a time
        </h2>
        <ol className="mt-6">
          {STOPS.map((stop, i) => (
            <Stop key={stop.title} n={i + 1} total={STOPS.length} terrace={TERRACE[i]} last={i === STOPS.length - 1} {...stop} />
          ))}
        </ol>
      </section>

      <p className="mt-12 max-w-2xl">
        Stepwell never sells your information or shares it with colleges or companies, and you can use most of it
        without an account.{" "}
        <Link href="/about-data">See where the data comes from</Link>.
      </p>
    </Page>
  );
}

function Stop({
  n,
  total,
  terrace,
  last,
  title,
  text,
  links,
  shot,
  alt,
}: (typeof STOPS)[number] & { n: number; total: number; terrace: string; last: boolean }): ReactNode {
  return (
    <li className={`relative pl-[28px] ${last ? "pb-2" : "pb-12"} ${terrace}`}>
      {/* The route: a 4px line down the steps, and a stone (a 16px square, not chosen yet) centred on it. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <span aria-hidden="true" className="absolute -left-[6px] top-1 size-4 border-2 border-primary bg-surface" />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="max-w-xl">
          <h3 className="text-lg font-bold">
            <span className="sr-only">
              Step {n} of {total}:{" "}
            </span>
            {title}
          </h3>
          <p className="mt-2">{text}</p>
          <ul className="mt-2">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="inline-flex min-h-11 items-center">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* A plain <img>: next/image adds an inline style, which the CSP blocks. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot}
          alt={alt}
          width={356}
          height={500}
          loading={n === 1 ? "eager" : "lazy"}
          className="h-auto w-full max-w-[240px] border border-border-subtle"
        />
      </div>
    </li>
  );
}
