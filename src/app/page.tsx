import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { cache, Suspense, type ReactNode } from "react";
import { Meter } from "@/components/meter";
import { Band, Page, PageTitle } from "@/components/page";
import { StepEdge } from "@/components/step-edge";
import { getApCourses, getCareer } from "@/lib/careers/data";
import { monthYear } from "@/lib/careers/labels";
import { collegesForCareer, getScorecardRetrieved } from "@/lib/colleges/data";
import { collegeMeters, ownershipName } from "@/lib/colleges/labels";
import { matchScholarships } from "@/lib/scholarships/data";
import { deadlineText, domainOf, firstOpen } from "@/lib/scholarships/labels";
import { SOURCES } from "@/lib/sources/list";
import { PayAndOutlook } from "./careers/pay-and-outlook";
import { CareerSearchForm } from "./careers/search-form";
import { StepwellScene } from "./stepwell-scene";

// The intro page (spec intro-page.md, decision 0012): the hero, then one real
// career walked down the four steps with live numbers from our own tables.
const EXAMPLE = { code: "29-1141.00", state: "OH", stateName: "Ohio" };
const STEPS = ["Careers", "Programs and colleges", "Money and experience", "Your plan"];

/** A failed lookup empties its step instead of breaking the page; Next's own signals (dynamic rendering) pass through. */
function orNull<T>(p: Promise<T>): Promise<T | null> {
  return p.catch((e: Error) => {
    unstable_rethrow(e);
    console.error(`Home example: ${e.message}`);
    return null;
  });
}

/** All four panels' data in one batch, once per request (React cache). */
const loadExample = cache(async () => {
  const [career, colleges, scholarships, apCourses, scorecardRetrieved] = await Promise.all([
    orNull(getCareer(EXAMPLE.code)),
    orNull(collegesForCareer(EXAMPLE.code, EXAMPLE.state, "bachelor")),
    orNull(matchScholarships(EXAMPLE.state, "high_school")),
    orNull(getApCourses(EXAMPLE.code)),
    orNull(getScorecardRetrieved()),
  ]);
  return {
    career,
    // The best-paid public or nonprofit program: a for-profit as the one example would read as an endorsement.
    college: colleges?.find((c) => c.ownership !== "for_profit") ?? null,
    scholarship: firstOpen(scholarships ?? []),
    course: apCourses?.[0] ?? null,
    scorecardRetrieved,
  };
});

// The hero and the step text render at once; each live panel streams in.
export default function Home() {
  return (
    <>
      <StepwellScene
        steps={STEPS}
        intro={
          <>
            <PageTitle size="hero">Find a career, then the path to it</PageTitle>
            <p className="mt-4">
              Stepwell shows what a career pays and takes, which college programs lead there, and the scholarships,
              internships and summer programs that help you get started. It uses official U.S. government data, and
              it’s free, with no ads.
            </p>
            <CareerSearchForm />
            <p className="mt-6">
              Not sure what you like? <Link href="/interests">Take the interest quiz</Link> and see careers that fit
              you.
            </p>
          </>
        }
      />
      <StepEdge from="band" to="page" />

      <Step
        n={1}
        on="page"
        text="See what the work is, what it pays, what training it takes, and the AP classes that help."
        links={[
          { href: "/careers", label: "Search careers" },
          { href: "/interests", label: "Take the interest quiz" },
        ]}
        lead={`Here is what Stepwell shows for one real career, registered nurses, with live numbers for ${EXAMPLE.stateName}.`}
      >
        <Suspense fallback={<PanelSkeleton />}>
          <CareerPanel />
        </Suspense>
      </Step>
      <StepEdge from="page" to="band" />

      <Step
        n={2}
        on="band"
        text="From any career, find the college programs that lead there, with cost, graduation rate and what graduates earn."
        links={[{ href: `/careers/${EXAMPLE.code}/colleges?state=${EXAMPLE.state}`, label: "See every nursing program in Ohio" }]}
      >
        <Suspense fallback={<PanelSkeleton />}>
          <CollegePanel />
        </Suspense>
      </Step>
      <StepEdge from="band" to="page" />

      <Step
        n={3}
        on="page"
        text="Scholarships and grants from official state and federal programs, paid federal internships, and free or paid summer programs."
        links={[
          { href: "/scholarships", label: "Find scholarships" },
          { href: "/internships", label: "Find internships" },
          { href: "/programs", label: "Find summer programs" },
        ]}
      >
        <Suspense fallback={<PanelSkeleton />}>
          <ScholarshipPanel />
        </Suspense>
      </Step>
      <StepEdge from="page" to="band" />

      <Step
        n={4}
        on="band"
        text="Save what fits and lay it out year by year, next to the real deadlines."
        links={[{ href: "/plan", label: "Start your plan" }]}
      >
        <Suspense fallback={<PanelSkeleton />}>
          <PlanPanel />
        </Suspense>
      </Step>
      <StepEdge from="band" to="page" />

      <Page width="browse">
        <section aria-labelledby="data-heading">
          <h2 id="data-heading" className="text-xl font-bold">
            Where the data comes from
          </h2>
          <p className="mt-2 max-w-2xl">
            Stepwell copies official U.S. government data into its own database on a schedule.{" "}
            <Link href="/about-data">See every source and when it was updated</Link>.
          </p>
          <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.id} className="border-b border-border-subtle py-3">
                <p className="font-bold">{s.name}</p>
                <p className="text-sm text-muted">{s.publisher}</p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="privacy-heading" className="mt-12 max-w-2xl">
          <h2 id="privacy-heading" className="text-xl font-bold">
            Your information stays yours
          </h2>
          <p className="mt-2">
            Stepwell never sells your information or shares it with colleges or companies, and you can use most of it
            without an account. <Link href="/privacy">Read the privacy policy</Link>.
          </p>
        </section>
        <section aria-labelledby="start-heading" className="mt-12 max-w-2xl">
          <h2 id="start-heading" className="text-xl font-bold">
            Start with a career
          </h2>
          <CareerSearchForm id="q-end" />
          <p className="mt-6">
            Not sure what you like? <Link href="/interests">Take the interest quiz</Link>.
          </p>
        </section>
      </Page>
    </>
  );
}

/** One step of the walk-through: what Stepwell does there, then the live example in a stone panel. */
function Step({
  n,
  on,
  text,
  links,
  lead,
  children,
}: {
  n: number;
  on: "band" | "page";
  text: string;
  links: { href: string; label: string }[];
  lead?: string;
  children: ReactNode;
}) {
  const body = (
    <section id={`step-${n}`} aria-labelledby={`step-${n}-heading`} className="scroll-mt-4">
      {lead && <p className="mb-8 max-w-2xl text-lg">{lead}</p>}
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
        <div>
          <h2 id={`step-${n}-heading`} className="text-xl font-bold">
            Step {n}: {STEPS[n - 1]}
          </h2>
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
        <div className="stone-panel p-4 sm:p-6">{children}</div>
      </div>
    </section>
  );
  return on === "band" ? <Band>{body}</Band> : <Page width="browse">{body}</Page>;
}

function Unavailable() {
  return <p className="text-muted">Live numbers for this step aren’t available right now.</p>;
}

async function CareerPanel() {
  const { career } = await loadExample();
  if (!career?.outlook) return <Unavailable />;
  return (
    <>
      <h3 className="font-heading text-lg font-bold">
        <Link href={`/careers/${career.onet_code}`}>{career.title}</Link>
      </h3>
      <PayAndOutlook career={career} heading="h3" />
    </>
  );
}

async function CollegePanel() {
  const { college, scorecardRetrieved } = await loadExample();
  if (!college) return <Unavailable />;
  const place = [ownershipName(college.ownership), [college.city, college.state].filter(Boolean).join(", ")];
  return (
    <>
      <h3 className="font-heading text-lg font-bold">{college.college}</h3>
      <p className="mt-1">
        {college.program}, {college.credential_title.toLowerCase()}
      </p>
      <p className="mt-1 text-sm text-muted">{place.filter(Boolean).join(". ")}.</p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {collegeMeters(college).map((m) => (
          <div key={m.label}>
            <dt className="float-left text-sm text-muted">{m.label}</dt>
            <dd>
              <p className={`text-right ${m.value ? "font-bold" : "text-sm text-muted"}`}>{m.value ?? "Not reported"}</p>
              {m.percent !== null && <Meter percent={m.percent} className="mt-1" />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">
        Source: College Scorecard, U.S. Department of Education
        {scorecardRetrieved ? `, retrieved ${monthYear(scorecardRetrieved)}` : ""}. Graduation rate: students who
        earned a credential within 8 years of starting.
      </p>
    </>
  );
}

async function ScholarshipPanel() {
  const { scholarship } = await loadExample();
  if (!scholarship) return <Unavailable />;
  return (
    <>
      <h3 className="font-heading text-lg font-bold">{scholarship.title}</h3>
      <p className="mt-1 text-sm text-muted">{scholarship.sponsor}</p>
      <p className="mt-2 font-bold">{scholarship.award_text}</p>
      <p className="mt-1">{deadlineText(scholarship).text}</p>
      <p className="mt-4 text-sm text-muted">
        Source: the official program page, <a href={scholarship.url}>{domainOf(scholarship.url)}</a>, listed by
        Stepwell.
      </p>
    </>
  );
}

async function PlanPanel() {
  const { course, scholarship, college } = await loadExample();
  if (!course && !scholarship) return <Unavailable />;
  return (
    <>
      <h3 className="font-heading text-lg font-bold">An example plan: 11th grade</h3>
      <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
        {course && <li className="py-3">Take {course.ap_name}</li>}
        {scholarship && <li className="py-3">Apply for the {scholarship.title}</li>}
        {college && <li className="py-3">Compare nursing programs, starting with {college.college}</li>}
      </ul>
      <p className="mt-4 text-sm text-muted">An example. Your own plan starts with what you save.</p>
    </>
  );
}

/** Bars shaped like a panel's heading, lines and meter (DESIGN.md "States"). */
function PanelSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading the example</p>
      <div aria-hidden="true">
        <div className="h-5 w-48 bg-border-subtle" />
        <div className="mt-3 h-3 w-64 max-w-full bg-border-subtle" />
        <div className="mt-6 h-8 w-40 bg-border-subtle" />
        <div className="mt-3 h-2 w-full bg-border-subtle" />
      </div>
    </div>
  );
}
