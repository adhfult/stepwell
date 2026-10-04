import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { buttonClass } from "@/components/button-styles";
import { Band, Page, PageTitle } from "@/components/page";
import { SaveButton } from "@/app/plan/save-button";
import { getCurrentUser } from "@/lib/auth/dal";
import { listOpportunities, type Opportunity } from "@/lib/opportunities/data";
import { getMySavedIds } from "@/lib/plan/data";
import { payText, placesText } from "@/lib/opportunities/labels";
import { getMyProfile } from "@/lib/profile/data";
import { STATES, stateName } from "@/lib/profile/options";
import { deadlineText } from "@/lib/scholarships/labels";

export const metadata: Metadata = { title: "Internships" };

const FIRST = 15; // phones get a short list first (a long list is clutter)

const paramsSchema = z.object({
  where: z.enum(["anywhere", "remote", ...STATES.map((s) => s.value)] as [string, ...string[]]).optional().catch(undefined),
  more: z.literal("1").optional().catch(undefined),
});

export default async function InternshipsPage({ searchParams }: PageProps<"/internships">) {
  const params = paramsSchema.parse(await searchParams);
  const profile = await getMyProfile();
  // Start from the student's state; "anywhere" means they cleared it on purpose.
  const where = params.where ?? profile?.state ?? "anywhere";
  const state = where === "anywhere" || where === "remote" ? undefined : where;

  const [postings, user, saved] = await Promise.all([
    listOpportunities({ state, remoteOnly: where === "remote" }),
    getCurrentUser(),
    getMySavedIds(),
  ]);
  const shown = params.more ? postings : postings.slice(0, FIRST);
  const scope = where === "remote" ? " you can do remotely" : state ? ` in ${stateName(state)} or remote` : "";

  return (
    <>
      <Band>
        <div className="max-w-2xl">
          <PageTitle>Internships</PageTitle>
          <p className="mt-4">
            Paid federal internships and student jobs that are open now. You apply on USAJOBS, the U.S. government’s job
            site. Most ask you to be enrolled in school.
          </p>
          <Filters where={where} />
        </div>
      </Band>
      <Page width="browse">
        {postings.length > 0 ? (
          <section aria-labelledby="list-heading">
            <h2 id="list-heading" className="text-lg font-bold">
              {postings.length} {postings.length === 1 ? "internship" : "internships"}
              {scope}
            </h2>
            <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {shown.map((o) => (
                <Posting key={o.id} o={o} saved={user ? saved.internships.has(o.id) : null} />
              ))}
            </ul>
            {!params.more && postings.length > FIRST && (
              <p className="mt-4">
                <Link href={`/internships?${new URLSearchParams({ where, more: "1" })}`}>
                  Show all {postings.length} internships
                </Link>
              </p>
            )}
          </section>
        ) : (
          <section aria-labelledby="none-heading" className="mt-10 max-w-2xl">
            <h2 id="none-heading" className="text-lg font-bold">
              No open internships{scope}
            </h2>
            <p className="mt-3">
              {where === "anywhere" ? (
                "New postings appear on USAJOBS every week, and this list updates daily. Check back soon."
              ) : (
                <>
                  New postings appear every week. Meanwhile, <Link href="/internships?where=anywhere">see every state</Link>.
                </>
              )}
            </p>
          </section>
        )}

        <p className="mt-8 max-w-2xl text-sm text-muted">
          Source: USAJOBS, U.S. Office of Personnel Management. Updated daily; the posting on USAJOBS has the final word.
        </p>
      </Page>
    </>
  );
}

function Filters({ where }: { where: string }) {
  return (
    <form action="/internships" method="get" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="sm:flex-1">
        <label htmlFor="where" className="block font-bold">
          Where
        </label>
        <select
          id="where"
          name="where"
          defaultValue={where}
          className="mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground"
        >
          <option value="anywhere">Anywhere</option>
          <option value="remote">Remote only</option>
          {STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={`${buttonClass("secondary")} justify-center`}>
        Show internships
      </button>
    </form>
  );
}

/** One posting: DESIGN.md deadline rules; the long parts fold away (native <details>). */
function Posting({ o, saved }: { o: Opportunity; saved: boolean | null }) {
  const deadline = deadlineText({
    deadline_kind: "date",
    deadline_date: o.closes_on,
    deadline_month_day: null,
    checked_at: o.retrieved_at.slice(0, 10),
  });
  const tone = deadline.tone === "urgent" ? "text-accent font-bold" : "";
  return (
    <li className="py-5">
      <h3 className="font-heading text-lg font-bold">{o.title}</h3>
      <p className="mt-1 text-sm text-muted">{o.organization}</p>
      <p className="mt-2">
        {placesText(o.places, o.remote)}
        {o.remote && o.places.length > 0 && !o.places.some((p) => /remote/i.test(p)) ? " (remote)" : ""}
      </p>
      <p className="mt-1">{payText(o)}</p>
      <p className={`mt-1 ${tone}`}>{deadline.text}</p>
      {o.who_may_apply && <p className="mt-1 text-sm">Who may apply: {o.who_may_apply}</p>}
      <p className="mt-2">
        <a href={o.url}>Apply on USAJOBS (usajobs.gov)</a>
      </p>
      {saved !== null && <SaveButton kind="internship" id={o.id} saved={saved} />}
      {(o.summary || o.places.length > 1) && (
        <details className="mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">Details</summary>
          {o.summary && <p className="mt-2">{o.summary}</p>}
          {o.places.length > 1 && (
            <>
              <p className="mt-3 text-sm font-bold">Places:</p>
              <ul className="mt-1 list-disc space-y-1 pl-6 text-sm">
                {o.places.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
    </li>
  );
}
