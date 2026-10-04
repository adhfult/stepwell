import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Meter } from "@/components/meter";
import { Band, Page, PageTitle } from "@/components/page";
import { SaveButton } from "@/app/plan/save-button";
import { getCurrentUser } from "@/lib/auth/dal";
import { monthYear } from "@/lib/careers/labels";
import { getCollege, getCollegePrograms, getScorecardRetrieved } from "@/lib/colleges/data";
import {
  BRACKETS,
  debtText,
  dollars,
  domainOf,
  earningsText,
  labelOf,
  LOCALES,
  ownershipName,
  policyName,
  SERVES,
} from "@/lib/colleges/labels";
import { getMySavedIds } from "@/lib/plan/data";
import { stateName } from "@/lib/profile/options";
import { CAPS, toPercent } from "@/lib/scale";

async function collegeFor(params: PageProps<"/colleges/[unitid]">["params"]) {
  const unitid = z.coerce.number().int().positive().max(2_147_483_647).safeParse((await params).unitid);
  if (!unitid.success) notFound();
  const college = await getCollege(unitid.data);
  if (!college) notFound();
  return college;
}

export async function generateMetadata({ params }: PageProps<"/colleges/[unitid]">): Promise<Metadata> {
  return { title: (await collegeFor(params)).name };
}

const percent = (n: number | string | null) => (n === null ? null : `${Math.round(Number(n) * 100)}%`);

export default async function CollegePage({ params }: PageProps<"/colleges/[unitid]">) {
  const c = await collegeFor(params);
  const [programs, retrieved, user, saved] = await Promise.all([
    getCollegePrograms(c.unitid),
    getScorecardRetrieved(),
    getCurrentUser(),
    getMySavedIds(),
  ]);

  const sat =
    c.sat_read_25 !== null && c.sat_math_25 !== null && c.sat_read_75 !== null && c.sat_math_75 !== null
      ? `${c.sat_read_25 + c.sat_math_25} to ${c.sat_read_75 + c.sat_math_75} (reading ${c.sat_read_25} to ${c.sat_read_75}, math ${c.sat_math_25} to ${c.sat_math_75})`
      : null;
  const act = c.act_25 !== null && c.act_75 !== null ? `${c.act_25} to ${c.act_75}` : null;
  const kind = [
    ownershipName(c.ownership),
    c.two_year === null ? null : c.two_year ? "two-year or shorter" : "four-year",
  ].filter(Boolean);
  const facts: [string, string | null][] = [
    ["Location", [c.city, c.state ? stateName(c.state) : null].filter(Boolean).join(", ") || null],
    ["Setting", labelOf(LOCALES, c.locale)],
    ["Type", kind.length ? kind.join(", ") : null],
    ["Minority-serving", (c.serves ?? []).map((s) => labelOf(SERVES, s)).join("; ") || null],
    ["Students", c.students === null ? null : c.students.toLocaleString("en-US")],
    ["Admission rate", percent(c.admission_rate)],
    ["Test scores", policyName(c.test_policy)],
    ["SAT, middle 50%", sat],
    ["ACT, middle 50%", act],
    ["Graduation rate", percent(c.graduation_rate)],
  ];
  // Group programs by credential, in level order (the query sorts by level).
  const groups = new Map<string, typeof programs>();
  for (const p of programs) groups.set(p.credential_title, [...(groups.get(p.credential_title) ?? []), p]);
  const domain = domainOf(c.website);

  return (
    <>
      <Band>
        <div className="max-w-2xl">
          <p>
            <Link href="/colleges">All colleges</Link>
          </p>
          <PageTitle>{c.name}</PageTitle>
          {domain && (
            <p className="mt-4">
              <a href={c.website!}>{domain}</a>
            </p>
          )}
          {user ? (
            <SaveButton kind="college" id={c.unitid} saved={saved.colleges.has(c.unitid)} />
          ) : (
            <p className="mt-4">
              <Link href={`/sign-in?next=${encodeURIComponent(`/colleges/${c.unitid}`)}`}>Sign in to save this college</Link>
            </p>
          )}
        </div>
      </Band>
      <Page width="browse">
        <section aria-labelledby="facts-heading" className="max-w-2xl">
          <h2 id="facts-heading" className="text-lg font-bold">
            Facts
          </h2>
          <dl className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {facts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-x-4 py-2 sm:grid-cols-3">
                <dt className="text-muted">{label}</dt>
                <dd className={`sm:col-span-2 ${value ? "" : "text-sm text-muted"}`}>{value ?? "Not reported"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="price-heading" className="mt-12 max-w-2xl">
          <h2 id="price-heading" className="text-lg font-bold">
            Net price by family income
          </h2>
          <p className="mt-2">
            What students paid in a year after grants and scholarships, for students who got federal aid.
            {c.net_price !== null && ` Average across all incomes: ${dollars(c.net_price)} a year.`}
          </p>
          <dl className="mt-4 space-y-3">
            {BRACKETS.map((b, i) => {
              const price = c.net_price_by_income?.[i] ?? null;
              return (
                <div key={b.value}>
                  <dt className="float-left text-sm text-muted">{b.label}</dt>
                  <dd>
                    <p className={`text-right ${price === null ? "text-sm text-muted" : "font-bold"}`}>
                      {price === null ? "Not reported" : `${dollars(price)} a year`}
                    </p>
                    {price !== null && <Meter percent={toPercent(price, CAPS.netPrice)} className="mt-1" />}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section aria-labelledby="programs-heading" className="mt-12 max-w-2xl">
          <h2 id="programs-heading" className="text-lg font-bold">
            Programs ({programs.length})
          </h2>
          {programs.length === 0 ? (
            <p className="mt-2">This college doesn’t report any programs with graduates yet.</p>
          ) : (
            [...groups].map(([credential, list]) => (
              <div key={credential} className="mt-6">
                <h3 className="font-heading font-bold">{credential}</h3>
                <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                  {list.map((p) => {
                    const outcomes = [earningsText(p.earnings_4yr, p.earnings_1yr), debtText(p.median_debt)].filter(Boolean);
                    return (
                      <li key={p.id} className="py-3">
                        <p>{p.title}</p>
                        <p className={`mt-1 text-sm ${outcomes.length ? "" : "text-muted"}`}>
                          {outcomes.length ? `${outcomes.join(". ")}.` : "Earnings and debt not reported"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        <p className="mt-8 max-w-2xl text-sm text-muted">
          Source: College Scorecard, U.S. Department of Education{retrieved ? `, retrieved ${monthYear(retrieved)}` : ""}.
          Graduation rate: students who earned a credential within 8 years of starting. Earnings are for graduates who got
          federal aid, 4 years after finishing unless marked.
        </p>
      </Page>
    </>
  );
}
