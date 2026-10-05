import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { buttonClass } from "@/components/button-styles";
import { Band, Page, PageTitle } from "@/components/page";
import { type Assoc, ASSOCIATIONS, TIMELINE } from "@/lib/athletes/rules";
import { SPORTS, TEAMS } from "@/lib/athletes/sports";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMyAcademicRecord } from "@/lib/gpa/data";
import { AddTimeline } from "./add-timeline";
import { CoreChecker } from "./core-checker";

export const metadata: Metadata = { title: "Athletes" };

const ASSOC_KEYS = Object.keys(ASSOCIATIONS) as [Assoc, ...Assoc[]];
const DIRECTORY_LEVEL: Record<Assoc, string> = { ncaa1: "d1", ncaa2: "d2", ncaa3: "d3", naia: "naia", juco: "juco" };
const field = "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";

export default async function AthletesPage({ searchParams }: PageProps<"/athletes">) {
  const level = z.enum(ASSOC_KEYS).catch("ncaa1").parse((await searchParams).level);
  const rule = ASSOCIATIONS[level];
  const [user, record] = await Promise.all([getCurrentUser(), getMyAcademicRecord()]);
  const steps = TIMELINE.filter((s) => s.assocs.includes(level));
  const grades = [9, 10, 11, 12].filter((g) => steps.some((s) => s.grade === g));

  return (
    <>
      <Band>
        <PageTitle>Playing a sport in college</PageTitle>
        <p className="mt-4 max-w-2xl">
          What each level asks of you in high school, a check of your saved classes, and the steps to take each year.
        </p>
        <form action="/athletes" className="mt-6 flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="level" className="block font-bold">
              Level
            </label>
            <select id="level" name="level" defaultValue={level} className={field}>
              {ASSOC_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ASSOCIATIONS[k].name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${buttonClass("secondary")} justify-center`}>
            Show
          </button>
        </form>
      </Band>
      <Page width="browse">
        <section aria-labelledby="rules-heading" className="max-w-2xl">
          <h2 id="rules-heading" className="text-lg font-bold">
            What {rule.name} asks for
          </h2>
          <p className="mt-2">{rule.summary}</p>
          <p className="mt-2 text-sm text-muted">
            Checked {rule.checked} on <a href={rule.source}>the official page</a>. Rules change; {rule.decides.name} has
            the final word.
          </p>
        </section>

        <section aria-labelledby="classes-heading" className="mt-12 max-w-2xl">
          <h2 id="classes-heading" className="text-lg font-bold">
            Your classes
          </h2>
          <div className="mt-2">
            {level === "ncaa3" || level === "juco" ? (
              <p>There’s no course check for this level; the summary above covers what you need.</p>
            ) : !user ? (
              <p>
                Sign in and save your classes on <Link href="/gpa">GPA and test scores</Link> to check them here.
              </p>
            ) : !record || record.courses.length === 0 ? (
              <p>
                Add your classes on the <Link href="/gpa">GPA page</Link> first.
              </p>
            ) : (
              <CoreChecker
                assoc={level}
                courses={record.courses}
                weights={record.weights}
                start={record.start}
                sat={record.sat}
                act={record.act}
              />
            )}
          </div>
        </section>

        <section aria-labelledby="timeline-heading" className="mt-12 max-w-2xl">
          <h2 id="timeline-heading" className="text-lg font-bold">
            Year by year
          </h2>
          {grades.map((g) => (
            <div key={g} className="mt-6">
              <h3 className="font-heading font-bold">{g}th grade</h3>
              <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                {steps
                  .filter((s) => s.grade === g)
                  .map((s) => (
                    <li key={s.title} className="py-2">
                      <a href={s.url}>{s.title}</a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {user ? (
            <AddTimeline assoc={level} />
          ) : (
            <p className="mt-6">
              <Link href="/sign-in">Sign in</Link> to add these steps to your plan.
            </p>
          )}
        </section>

        <section aria-labelledby="teams-heading" className="mt-12 max-w-2xl">
          <h2 id="teams-heading" className="text-lg font-bold">
            Find teams
          </h2>
          <form action="/colleges" className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="level" value={DIRECTORY_LEVEL[level]} />
            <div>
              <label htmlFor="sport" className="block font-bold">
                Sport
              </label>
              <select id="sport" name="sport" defaultValue="" className={field}>
                <option value="">Any sport</option>
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="team" className="block font-bold">
                Team
              </label>
              <select id="team" name="team" defaultValue="" className={field}>
                <option value="">Men’s or women’s</option>
                {TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={`${buttonClass("secondary")} justify-center sm:col-span-2 sm:justify-self-start`}>
              Find colleges
            </button>
          </form>
        </section>

        <p className="mt-12 max-w-2xl text-sm text-muted">
          Rules: Stepwell’s summary of the NCAA, NAIA and NJCAA pages linked above. Teams: U.S. Department of Education,
          Equity in Athletics Data Analysis (EADA).
        </p>
      </Page>
    </>
  );
}
