import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/button-styles";
import { Meter } from "@/components/meter";
import { Band, Page, PageTitle } from "@/components/page";
import { monthYear } from "@/lib/careers/labels";
import { getScorecardRetrieved, searchColleges, type DirectoryRow } from "@/lib/colleges/data";
import { getMyScores } from "@/lib/gpa/data";
import {
  ADMIT,
  BRACKETS,
  directorySchema,
  dollars,
  fitText,
  labelOf,
  LOCALES,
  ownershipName,
  SERVES,
  SIZES,
  SORTS,
  testFit,
  TYPES,
  YEARS,
  type Directory,
} from "@/lib/colleges/labels";
import { STATES } from "@/lib/profile/options";
import { CAPS, toPercent } from "@/lib/scale";

export const metadata: Metadata = { title: "Colleges" };

const PER_PAGE = 24; // search_colleges() pages by 24

export default async function CollegesPage({ searchParams }: PageProps<"/colleges">) {
  const params = directorySchema.parse(await searchParams);
  const [rows, retrieved, saved] = await Promise.all([searchColleges(params), getScorecardRetrieved(), getMyScores()]);
  // Scores typed here win; otherwise the ones saved on /gpa.
  const typed = Boolean(params.sat || params.act);
  const mine = typed ? params : saved;
  const usingSaved = !typed && Boolean(saved.sat || saved.act);
  const total = Number(rows[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(params.page ?? 1, pages);
  const bracket = labelOf(BRACKETS, params.bracket);

  // Page links keep every (validated) filter.
  const hrefFor = (n: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== "page") query.set(key, String(value));
    }
    if (n > 1) query.set("page", String(n));
    return `/colleges${query.size ? `?${query}` : ""}`;
  };

  return (
    <>
      <Band>
        <div className="max-w-2xl">
          <PageTitle>Colleges</PageTitle>
          <p className="mt-4">
            Every college in the U.S. Department of Education’s College Scorecard. Filter by what matters to you, then open
            a college to see its cost by family income, test scores and programs.
          </p>
        </div>
        <Filters params={params} />
      </Band>
      <Page width="browse">
        {total > 0 ? (
          <section aria-labelledby="list-heading">
            <h2 id="list-heading" className="text-lg font-bold">
              {total.toLocaleString("en-US")} {total === 1 ? "college" : "colleges"}
            </h2>
            {bracket && <p className="mt-1">Net price shown for a family income of {bracket}.</p>}
            {usingSaved && (
              <p className="mt-1">
                Using your saved {[saved.sat && `SAT ${saved.sat}`, saved.act && `ACT ${saved.act}`].filter(Boolean).join(" and ")}{" "}
                from <Link href="/gpa">GPA and test scores</Link>.
              </p>
            )}
            {mine.sat && (
              <p className="mt-1 text-sm text-muted">
                SAT ranges add the reading and math scores, so where your score falls is approximate.
              </p>
            )}
            <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {rows.map((c) => (
                <Row key={c.unitid} c={c} mine={mine} />
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                {page > 1 && <Link href={hrefFor(page - 1)}>Previous page</Link>}
                <p>
                  Page {page} of {pages.toLocaleString("en-US")}
                </p>
                {page < pages && <Link href={hrefFor(page + 1)}>Next page</Link>}
              </nav>
            )}
          </section>
        ) : (
          <section aria-labelledby="none-heading" className="mt-10 max-w-2xl">
            <h2 id="none-heading" className="text-lg font-bold">
              No colleges match. Remove a filter.
            </h2>
            <p className="mt-3">
              <Link href="/colleges">Clear all filters</Link>
            </p>
          </section>
        )}

        <p className="mt-8 max-w-2xl text-sm text-muted">
          Source: College Scorecard, U.S. Department of Education{retrieved ? `, retrieved ${monthYear(retrieved)}` : ""}.
          Net price is the average yearly cost after grants and scholarships. Graduation rate: students who earned a
          credential within 8 years of starting. Test score ranges are the middle 50% of admitted students.
        </p>
      </Page>
    </>
  );
}

const field = "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";

function Select({
  id,
  label,
  choices,
  value,
  any,
}: {
  id: string;
  label: string;
  choices: readonly { value: string; label: string }[];
  value?: string;
  any: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <select id={id} name={id} defaultValue={value ?? ""} className={field}>
        <option value="">{any}</option>
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Input({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

/** A plain GET form (works without JavaScript); the less common filters fold away so phones stay short. */
function Filters({ params: p }: { params: Directory }) {
  const more = [p.program, p.type, p.size, p.bracket, p.max, p.admit, p.optional, p.setting, p.years, p.serves, p.sat, p.act];
  return (
    <form action="/colleges" method="get" role="search" aria-label="Colleges" className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <Input id="q" label="College name">
          <input id="q" name="q" type="search" defaultValue={p.q} maxLength={100} className={field} />
        </Input>
        <Select id="state" label="State" choices={STATES} value={p.state} any="All states" />
        <Select id="sort" label="Sort by" choices={SORTS} value={p.sort} any="Name" />
      </div>
      <details className="mt-4" open={more.some((v) => v !== undefined)}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold underline">
          More filters: cost, test scores, type, setting
        </summary>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-3">
          <Select id="bracket" label="Your family’s yearly income" choices={BRACKETS} value={p.bracket} any="Not chosen" />
          <Input id="max" label="Most you’d pay a year" hint="Net price, in dollars">
            <input
              id="max"
              name="max"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={p.max}
              aria-describedby="max-hint"
              className={field}
            />
          </Input>
          <Input id="sat" label="My SAT (400 to 1600)" hint="Only used on this page, never saved">
            <input
              id="sat"
              name="sat"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={p.sat}
              aria-describedby="sat-hint"
              className={field}
            />
          </Input>
          <Input id="act" label="My ACT (1 to 36)" hint="Only used on this page, never saved">
            <input
              id="act"
              name="act"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={p.act}
              aria-describedby="act-hint"
              className={field}
            />
          </Input>
          <Select id="type" label="Type" choices={TYPES} value={p.type} any="Any type" />
          <Select id="size" label="Size" choices={SIZES} value={p.size} any="Any size" />
          <Select id="admit" label="Admission rate" choices={ADMIT} value={p.admit} any="Any rate" />
          <Select id="setting" label="Setting" choices={LOCALES} value={p.setting} any="Any setting" />
          <Select id="years" label="Length" choices={YEARS} value={p.years} any="Any length" />
          <Select id="serves" label="Minority-serving" choices={SERVES} value={p.serves} any="Any college" />
          <Input id="program" label="Has a program in" hint="For example: nursing">
            <input
              id="program"
              name="program"
              type="search"
              defaultValue={p.program}
              maxLength={100}
              aria-describedby="program-hint"
              className={field}
            />
          </Input>
          <div className="flex min-h-11 items-center gap-3 sm:mt-8">
            <input
              id="optional"
              name="optional"
              type="checkbox"
              value="1"
              defaultChecked={p.optional === "1"}
              className="size-5"
            />
            <label htmlFor="optional">Test-optional only</label>
          </div>
        </div>
      </details>
      <button type="submit" className={`${buttonClass("secondary")} mt-4 justify-center`}>
        Show colleges
      </button>
    </form>
  );
}

/** One college: facts as a sentence, then cost, admission and graduation as bars (DESIGN.md "Data graphics"). */
function Row({ c, mine }: { c: DirectoryRow; mine: { sat?: number; act?: number } }) {
  const facts = [
    [c.city, c.state].filter(Boolean).join(", ") || null,
    ownershipName(c.ownership),
    c.students === null ? null : `${Number(c.students).toLocaleString("en-US")} students`,
  ].filter(Boolean);
  const rate = (n: number | string | null) => (n === null ? null : Number(n));
  const admit = rate(c.admission_rate);
  const grad = rate(c.graduation_rate);
  const meters = [
    {
      label: "Net price",
      value: c.price === null ? null : `${dollars(Number(c.price))} a year`,
      percent: c.price === null ? null : toPercent(Number(c.price), CAPS.netPrice),
    },
    {
      label: "Admission rate",
      value: admit === null ? null : `${Math.round(admit * 100)}%`,
      percent: admit === null ? null : toPercent(admit, CAPS.rate),
    },
    {
      label: "Graduation rate",
      value: grad === null ? null : `${Math.round(grad * 100)}%`,
      percent: grad === null ? null : toPercent(grad, CAPS.rate),
    },
  ];
  const sat =
    c.sat_read_25 !== null && c.sat_math_25 !== null && c.sat_read_75 !== null && c.sat_math_75 !== null
      ? `SAT ${c.sat_read_25 + c.sat_math_25} to ${c.sat_read_75 + c.sat_math_75}`
      : null;
  const act = c.act_25 !== null && c.act_75 !== null ? `ACT ${c.act_25} to ${c.act_75}` : null;
  const ranges = [sat, act].filter(Boolean);
  const fit = testFit(c, mine);
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-heading text-lg font-bold">
          <Link href={`/colleges/${c.unitid}`}>{c.name}</Link>
        </h3>
        {fit && (
          <span className="border border-border-strong bg-surface px-2 py-1 text-sm font-bold text-foreground">
            {fitText(fit)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{facts.join(". ")}.</p>
      {ranges.length > 0 && <p className="mt-1 text-sm">Middle 50% of admitted students: {ranges.join(", ")}.</p>}
      <dl className="mt-3 grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-3">
        {meters.map((m) => (
          <div key={m.label}>
            <dt className="float-left text-sm text-muted">{m.label}</dt>
            <dd>
              <p className={`text-right ${m.value ? "font-bold" : "text-sm text-muted"}`}>{m.value ?? "Not reported"}</p>
              {m.percent !== null && <Meter percent={m.percent} className="mt-1" />}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
