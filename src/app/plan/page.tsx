import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-styles";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { todayEastern } from "@/lib/opportunities/data";
import { getMyPlan, type Plan, type PlanItem } from "@/lib/plan/data";
import { bucket, collegeYear, KINDS, planYears, scholarshipYear, schoolYear, TERMS, yearHeading } from "@/lib/plan/labels";
import { getMyProfile } from "@/lib/profile/data";
import { deadlineText, domainOf } from "@/lib/scholarships/labels";
import { changePlanItem } from "./actions";
import { PlanItemForm } from "./item-form";
import { SaveButton } from "./save-button";

export const metadata: Metadata = { title: "My plan" };

const TERM_ORDER = TERMS.map((t) => t.value as string);
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) return <SignedOut />;

  const [plan, profile] = await Promise.all([getMyPlan(), getMyProfile()]);
  const today = todayEastern();
  const current = schoolYear(today);
  const stage = profile?.stage ?? null;
  const gradYear = profile?.grad_year ?? null;
  const at = (year: number) => bucket(year, stage, gradYear);

  const years = planYears(current, stage, gradYear, [
    ...plan.items.flatMap((i) => (i.academic_year ? [i.academic_year] : [])),
    ...plan.scholarships.map((s) => (s.live ? scholarshipYear(s.live, today) : current)),
  ]);
  const yearOptions = years.map((y) => ({ value: String(y), label: yearHeading(y, stage, gradYear) }));
  const undated = plan.items.filter((i) => i.academic_year === null);
  const empty = plan.items.length === 0 && plan.scholarships.length === 0 && plan.colleges.length === 0;
  const needsGradYear = !gradYear && stage !== "adult_learner";

  return (
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle>My plan</PageTitle>
        <p className="mt-4">
          Your classes, tasks and applications, year by year, with the scholarships and colleges you saved. Deadlines
          come from the official lists each time you look.
        </p>
        {needsGradYear && (
          <p className="mt-4">
            <Link href="/account/profile">Add your expected graduation year</Link> to see your plan by grade.
          </p>
        )}
      </div>

      {empty && (
        <section aria-labelledby="empty-heading" className="mt-10 max-w-2xl">
          <h2 id="empty-heading" className="text-lg font-bold">
            Nothing in your plan yet
          </h2>
          <p className="mt-3">
            Add a step below, or save scholarships and colleges as you browse. Not sure where to start? Try the{" "}
            <Link href="/interests">interest quiz</Link>, look through <Link href="/careers">careers</Link>, or find{" "}
            <Link href="/scholarships">scholarships</Link>.
          </p>
        </section>
      )}

      <div className="mt-10 max-w-2xl">
        {years.map((year) => (
          <YearSection
            key={year}
            heading={yearHeading(year, stage, gradYear)}
            open={year === current}
            items={plan.items.filter((i) => i.academic_year !== null && at(i.academic_year) === year)}
            scholarships={plan.scholarships.filter((s) => at(s.live ? scholarshipYear(s.live, today) : current) === year)}
            colleges={at(collegeYear(current, stage, gradYear)) === year ? plan.colleges : []}
            years={yearOptions}
            today={today}
          />
        ))}
        {undated.length > 0 && (
          <YearSection heading="No set year" open items={undated} scholarships={[]} colleges={[]} years={yearOptions} today={today} />
        )}
      </div>

      <section aria-labelledby="add-heading" className="mt-12 max-w-2xl">
        <h2 id="add-heading" className="text-lg font-bold">
          Add a step
        </h2>
        <PlanItemForm years={yearOptions} />
      </section>

      <p className="mt-8 max-w-2xl text-sm text-muted">
        Deadlines: official state and federal program pages, listed by Stepwell. Colleges: College Scorecard, U.S.
        Department of Education. Always check the official page before you apply.
      </p>
    </Page>
  );
}

function SignedOut() {
  return (
    <Page>
      <PageTitle>My plan</PageTitle>
      <p className="mt-4">
        Plan your classes, tasks and applications year by year, next to the scholarships and colleges you save, with
        their real deadlines. Your plan is private to you.
      </p>
      <p className="mt-6">
        <Link href="/sign-in?next=%2Fplan" className={buttonClass()}>
          Sign in to start your plan
        </Link>
      </p>
      <p className="mt-4">
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </Page>
  );
}

/** One school year, folded on every screen except the current year (native <details>, no script). */
function YearSection({
  heading,
  open,
  items,
  scholarships,
  colleges,
  years,
  today,
}: {
  heading: string;
  open: boolean;
  items: PlanItem[];
  scholarships: Plan["scholarships"];
  colleges: Plan["colleges"];
  years: { value: string; label: string }[];
  today: string;
}) {
  const count = items.length + scholarships.length + colleges.length;
  const sorted = [...items].sort((a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term));
  return (
    <details open={open} className="border-t border-border-subtle py-2">
      <summary className="flex min-h-11 cursor-pointer items-center gap-3">
        <h2 className="inline font-heading text-lg font-bold">{heading}</h2>
        <span className="text-sm text-muted">{count === 0 ? "Nothing yet" : `${count} ${count === 1 ? "thing" : "things"}`}</span>
      </summary>
      <ul className="divide-y divide-border-subtle">
        {sorted.map((item) => (
          <ItemRow key={item.id} item={item} years={years} />
        ))}
        {scholarships.map((s) => (
          <li key={s.id} className="py-4">
            <p className="text-sm text-muted">Saved scholarship</p>
            <h3 className="font-bold">{s.live?.title ?? s.title}</h3>
            {s.live ? <Deadline s={s.live} today={today} /> : <p className="mt-1 text-muted">No longer listed</p>}
            {s.live && (
              <p className="mt-1">
                <a href={s.live.url}>Apply on the official site ({domainOf(s.live.url)})</a>
              </p>
            )}
            <SaveButton kind="scholarship" id={s.id} saved />
          </li>
        ))}
        {colleges.map((c) => (
          <li key={c.unitid} className="py-4">
            <p className="text-sm text-muted">Saved college: applications are usually due this year</p>
            <h3 className="font-bold">{c.live?.name ?? c.title}</h3>
            {c.live ? (
              <p className="mt-1 text-sm text-muted">
                {[c.live.city, c.live.state].filter(Boolean).join(", ")}
                {c.live.website && (
                  <>
                    {" "}
                    <a href={c.live.website}>{domainOf(c.live.website)}</a>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-muted">No longer listed</p>
            )}
            <SaveButton kind="college" id={c.unitid} saved />
          </li>
        ))}
      </ul>
    </details>
  );
}

function Deadline({ s, today }: { s: Parameters<typeof deadlineText>[0]; today: string }) {
  const d = deadlineText(s, new Date(`${today}T12:00:00`));
  const tone = d.tone === "urgent" ? "text-accent font-bold" : d.tone === "closed" ? "text-muted" : "";
  return <p className={`mt-1 ${tone}`}>{d.text}</p>;
}

function ItemRow({ item, years }: { item: PlanItem; years: { value: string; label: string }[] }) {
  const facts = [
    KINDS.find((k) => k.value === item.kind)?.label,
    item.term === "full_year" ? null : TERMS.find((t) => t.value === item.term)?.label,
    item.due_on ? `Due ${shortDate.format(new Date(`${item.due_on}T00:00:00Z`))}` : null,
  ].filter(Boolean);
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className={`font-bold ${item.done ? "text-muted" : ""}`}>{item.title}</h3>
        {item.done && <span className="bg-highlight px-2 py-1 text-sm font-bold text-foreground">Done</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{facts.join(". ")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <form action={changePlanItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="action" value={item.done ? "undo" : "done"} />
          <button type="submit" className={buttonClass("secondary")}>
            {item.done ? "Not done yet" : "Mark done"}
          </button>
        </form>
        <form action={changePlanItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="action" value="delete" />
          <button type="submit" className="inline-flex min-h-11 items-center text-accent underline">
            Delete<span className="sr-only">: {item.title}</span>
          </button>
        </form>
      </div>
      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
          Edit or move<span className="sr-only">: {item.title}</span>
        </summary>
        <PlanItemForm item={item} years={years} />
      </details>
    </li>
  );
}
