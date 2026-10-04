import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/button-styles";
import { Meter } from "@/components/meter";
import { Band, Page, PageTitle } from "@/components/page";
import { getCareer } from "@/lib/careers/data";
import { onetCodeSchema } from "@/lib/careers/labels";
import {
  collegesForCareer,
  getScorecardRetrieved,
  type CollegeProgram,
} from "@/lib/colleges/data";
import {
  collegeMeters,
  debtText,
  domainOf,
  earningsText,
  filtersSchema,
  LEVELS,
  ownershipName,
} from "@/lib/colleges/labels";
import { monthYear } from "@/lib/careers/labels";
import { getMySavedIds } from "@/lib/plan/data";
import { getMyProfile } from "@/lib/profile/data";
import { getCurrentUser } from "@/lib/auth/dal";
import { SaveButton } from "@/app/plan/save-button";
import { STATES, stateName } from "@/lib/profile/options";

async function careerFor(
  params: PageProps<"/careers/[code]/colleges">["params"],
) {
  const code = onetCodeSchema.safeParse((await params).code);
  if (!code.success) notFound();
  const career = await getCareer(code.data);
  if (!career) notFound();
  return career;
}

export async function generateMetadata({
  params,
}: PageProps<"/careers/[code]/colleges">): Promise<Metadata> {
  return { title: `Colleges for ${(await careerFor(params)).title}` };
}

export default async function CareerCollegesPage({
  params,
  searchParams,
}: PageProps<"/careers/[code]/colleges">) {
  const career = await careerFor(params);
  const query = await searchParams;
  const filters = filtersSchema.parse(query);

  // No state chosen yet: start with the student's profile state, if any.
  // "all" in the URL means they chose every state on purpose.
  const profileState =
    query.state === undefined ? (await getMyProfile())?.state : undefined;
  const state =
    filters.state ??
    (query.state === "all" ? undefined : (profileState ?? undefined));
  const showAll = query.more === "1";

  const [colleges, retrieved, user, saved] = await Promise.all([
    collegesForCareer(career.onet_code, state, filters.level),
    getScorecardRetrieved(),
    getCurrentUser(),
    getMySavedIds(),
  ]);

  return (
    <>
      <Band>
        <div className="max-w-2xl">
          <p>
            <Link
              href={`/careers/${career.onet_code}`}
              className="inline-flex min-h-11 items-center"
            >
              Back to {career.title}
            </Link>
          </p>
          <PageTitle>Colleges for {career.title}</PageTitle>
          <p className="mt-4">
            Programs at U.S. colleges that lead to this career, with the best-paid
            graduates first. Earnings are median yearly pay 4 years after
            finishing, unless marked; earnings and debt are for students who got
            federal financial aid.
          </p>
          <Filters code={career.onet_code} state={state} level={filters.level} />
        </div>
      </Band>
      <Page width="browse">
        {colleges.length > 0 ? (
          <section aria-labelledby="colleges-heading">
            <h2 id="colleges-heading" className="text-lg font-bold">
              {colleges.length === 50
                ? "Top 50 programs"
                : `${colleges.length} ${colleges.length === 1 ? "program" : "programs"}`}
              {state ? ` in ${stateName(state)}` : ""}
            </h2>
            <CollegeList
              colleges={colleges}
              showAll={showAll}
              moreHref={moreHref(career.onet_code, state, filters.level)}
              saved={user ? saved.colleges : null}
            />
          </section>
        ) : (
          <section aria-labelledby="none-heading" className="mt-10 max-w-2xl">
            <h2 id="none-heading" className="text-lg font-bold">
              No programs found{state ? ` in ${stateName(state)}` : ""}
            </h2>
            <p className="mt-3">
              {state
                ? "Try all states, or another kind of credential."
                : "Try another kind of credential."}
            </p>
            {state && (
              <p className="mt-3">
                <Link
                  href={`/careers/${career.onet_code}/colleges?state=all${filters.level ? `&level=${filters.level}` : ""}`}
                >
                  Show all states
                </Link>
              </p>
            )}
          </section>
        )}

        <p className="mt-8 max-w-2xl text-sm text-muted">
          Source: College Scorecard, U.S. Department of Education
          {retrieved ? `, retrieved ${monthYear(retrieved)}` : ""}. Programs
          matched to careers with the O*NET CIP to O*NET-SOC crosswalk by
          USDOL/ETA, used under the{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/">
            CC BY 4.0 license
          </a>
          . Graduation rate: students who earned a credential within 8 years of
          starting.
        </p>
      </Page>
    </>
  );
}

/** GET form, so the choices stay in the URL. */
function Filters({
  code,
  state,
  level,
}: {
  code: string;
  state?: string;
  level?: string;
}) {
  const select =
    "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";
  return (
    <form
      action={`/careers/${code}/colleges`}
      method="get"
      className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="sm:flex-1">
        <label htmlFor="state" className="block font-bold">
          State
        </label>
        <select
          id="state"
          name="state"
          defaultValue={state ?? "all"}
          className={select}
        >
          <option value="all">All states</option>
          {STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:flex-1">
        <label htmlFor="level" className="block font-bold">
          Credential
        </label>
        <select
          id="level"
          name="level"
          defaultValue={level ?? ""}
          className={select}
        >
          <option value="">Any credential</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className={`${buttonClass("secondary")} justify-center`}
      >
        Show programs
      </button>
    </form>
  );
}

// Phones get a short list first (a long list is clutter); the rest is one tap away.
const FIRST = 15;

function moreHref(code: string, state?: string, level?: string) {
  const q = new URLSearchParams({
    state: state ?? "all",
    ...(level ? { level } : {}),
    more: "1",
  });
  return `/careers/${code}/colleges?${q}`;
}

/**
 * A list with dividers: college, program, then what it pays and costs. When
 * every row is the same program, its name is said once, not on every row.
 */
function CollegeList({
  colleges,
  showAll,
  moreHref,
  saved,
}: {
  colleges: CollegeProgram[];
  showAll: boolean;
  moreHref: string;
  /** The student's saved colleges; null when signed out (no Save buttons). */
  saved: Set<number> | null;
}) {
  const titles = new Set(colleges.map((c) => c.program));
  const sharedTitle = titles.size === 1 ? colleges[0].program : null;
  const shown = showAll ? colleges : colleges.slice(0, FIRST);
  return (
    <>
      {sharedTitle && <p className="mt-2">Program: {sharedTitle}</p>}
      <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
        {shown.map((c) => {
          const outcomes = [
            earningsText(c.earnings_4yr, c.earnings_1yr),
            debtText(c.median_debt),
          ].filter(Boolean);
          // Net price and graduation rate are drawn as bars on every screen.
          const college = [
            ownershipName(c.ownership),
            [c.city, c.state].filter(Boolean).join(", ") || null,
          ].filter(Boolean);
          const domain = domainOf(c.website);
          return (
            <li key={c.program_id} className="py-4">
              <h3 className="font-heading text-lg font-bold">{c.college}</h3>
              <p className="mt-1">
                {sharedTitle
                  ? c.credential_title
                  : `${c.program}, ${c.credential_title.toLowerCase()}`}
              </p>
              {/* Phones: earnings and debt as a sentence; from 640px they're bars too. */}
              <p className="mt-1 sm:hidden">
                {outcomes.length > 0 ? (
                  `${outcomes.join(". ")}.`
                ) : (
                  <span className="text-muted">
                    Earnings and debt not reported
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-muted">{college.join(". ")}.</p>
              <dl className="mt-3 grid max-w-2xl gap-x-8 gap-y-3 sm:grid-cols-2">
                {collegeMeters(c).map((m) => (
                  <div key={m.label} className={m.phone ? "" : "hidden sm:block"}>
                    <div className="flex justify-between gap-3">
                      <dt className="text-sm text-muted">{m.label}</dt>
                      <dd className={m.value ? "font-bold" : "text-sm text-muted"}>{m.value ?? "Not reported"}</dd>
                    </div>
                    {m.percent !== null && <Meter percent={m.percent} className="mt-1" />}
                  </div>
                ))}
              </dl>
              {domain && (
                <p className="mt-1 text-sm">
                  <a href={c.website!}>{domain}</a>
                </p>
              )}
              {saved && <SaveButton kind="college" id={c.unitid} saved={saved.has(c.unitid)} />}
            </li>
          );
        })}
      </ul>
      {!showAll && colleges.length > FIRST && (
        <p className="mt-4">
          <Link href={moreHref}>Show all {colleges.length} programs</Link>
        </p>
      )}
    </>
  );
}
