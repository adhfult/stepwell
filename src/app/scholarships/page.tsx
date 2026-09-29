import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { buttonClass } from "@/components/button-styles";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMyProfile } from "@/lib/profile/data";
import { STAGES, STATES, stateName } from "@/lib/profile/options";
import { getMyEligibility, matchScholarships, type ScholarshipMatch } from "@/lib/scholarships/data";
import { checkedText, deadlineText, domainOf, FIELDS } from "@/lib/scholarships/labels";

export const metadata: Metadata = { title: "Scholarships and grants" };

const FIRST = 15; // phones get a short list first (a long list is clutter)

const paramsSchema = z.object({
  state: z.enum(["all", ...STATES.map((s) => s.value)] as [string, ...string[]]).optional().catch(undefined),
  stage: z.enum(["any", ...STAGES.map((s) => s.value)] as [string, ...string[]]).optional().catch(undefined),
  fields: z
    .string()
    .regex(/^\d{2}(,\d{2}){0,9}$/)
    .optional()
    .catch(undefined),
  more: z.literal("1").optional().catch(undefined),
});

export default async function ScholarshipsPage({ searchParams }: PageProps<"/scholarships">) {
  const params = paramsSchema.parse(await searchParams);
  const [user, profile] = await Promise.all([getCurrentUser(), getMyProfile()]);
  const eligibility = user ? await getMyEligibility() : null;

  // Start from the student's profile; "all" / "any" means they cleared it on purpose.
  const state = params.state === "all" ? undefined : (params.state ?? profile?.state ?? undefined);
  const stage = params.stage === "any" ? undefined : (params.stage ?? profile?.stage ?? undefined);
  const fields = params.fields?.split(",");

  const all = await matchScholarships(state, stage);
  const listings = fields ? all.filter((s) => s.fields.some((f) => fields.includes(f))) : all;
  const shown = params.more ? listings : listings.slice(0, FIRST);
  const moreHref = `/scholarships?${new URLSearchParams({
    state: state ?? "all",
    stage: stage ?? "any",
    ...(params.fields ? { fields: params.fields } : {}),
    more: "1",
  })}`;

  return (
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle>Scholarships and grants</PageTitle>
        <p className="mt-4">
          Money for college you don’t pay back, from official state and federal programs. Every listing links to its
          official page, where you apply. Submit at least a day early.
        </p>

        {user ? (
          <p className="mt-4">
            {eligibility ? (
              <>
                Matched using your answers. <Link href="/account/eligibility">Change your answers</Link>
              </>
            ) : (
              <>
                <Link href="/account/eligibility">Answer a few optional questions</Link> to see which ones you qualify
                for.
              </>
            )}
          </p>
        ) : (
          <p className="mt-4">
            <Link href="/sign-in?next=%2Fscholarships">Sign in</Link> to see which ones you qualify for.
          </p>
        )}

        <Filters state={state} stage={stage} fields={params.fields} />
        {fields && (
          <p className="mt-4">
            Showing programs for{" "}
            {fields.map((f) => FIELDS.find((x) => x.value === f)?.label ?? f).join(", ").toLowerCase()}.{" "}
            <Link href={`/scholarships?state=${state ?? "all"}&stage=${stage ?? "any"}`}>Show every field</Link>
          </p>
        )}
      </div>

      {listings.length > 0 ? (
        <section aria-labelledby="list-heading" className="mt-10">
          <h2 id="list-heading" className="text-lg font-bold">
            {listings.length} {listings.length === 1 ? "program" : "programs"}
            {state ? ` for ${stateName(state)} students` : ""}
          </h2>
          <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {shown.map((s) => (
              <Listing key={s.id} s={s} />
            ))}
          </ul>
          {!params.more && listings.length > FIRST && (
            <p className="mt-4">
              <Link href={moreHref}>Show all {listings.length} programs</Link>
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="none-heading" className="mt-10 max-w-2xl">
          <h2 id="none-heading" className="text-lg font-bold">
            No programs match
          </h2>
          <p className="mt-3">
            {eligibility
              ? "None of these programs fit your answers. Try another state or school stage, or change your answers."
              : "Try another state or school stage."}
          </p>
        </section>
      )}

      <p className="mt-8 max-w-2xl text-sm text-muted">
        Source: official state and federal program pages, listed by Stepwell (each listing says when it was checked).
        So far: federal programs and California, Florida, New York, Pennsylvania and Texas. More states are coming.
      </p>
    </Page>
  );
}

function Filters({ state, stage, fields }: { state?: string; stage?: string; fields?: string }) {
  const select = "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";
  return (
    <form action="/scholarships" method="get" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      {fields && <input type="hidden" name="fields" value={fields} />}
      <div className="sm:flex-1">
        <label htmlFor="state" className="block font-bold">
          State you live in
        </label>
        <select id="state" name="state" defaultValue={state ?? "all"} className={select}>
          <option value="all">All states</option>
          {STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:flex-1">
        <label htmlFor="stage" className="block font-bold">
          Where you are in school
        </label>
        <select id="stage" name="stage" defaultValue={stage ?? "any"} className={select}>
          <option value="any">Any</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={`${buttonClass("secondary")} justify-center`}>
        Show programs
      </button>
    </form>
  );
}

/** One listing: DESIGN.md tags (words, never color alone) and deadline rules. */
function Listing({ s }: { s: ScholarshipMatch }) {
  const deadline = deadlineText(s);
  const tone = deadline.tone === "urgent" ? "text-accent font-bold" : deadline.tone === "closed" ? "text-muted" : "";
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-heading text-lg font-bold">{s.title}</h3>
        {s.match === "qualify" && <span className="bg-highlight px-2 py-1 text-sm font-bold text-foreground">You qualify</span>}
        {s.match === "might" && (
          <span className="border border-border-strong bg-surface px-2 py-1 text-sm font-bold text-foreground">
            You might qualify
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{s.sponsor}</p>
      {s.award_text && <p className="mt-2">{s.award_text}</p>}
      <p className={`mt-1 ${tone}`}>{deadline.text}</p>
      <p className="mt-2">
        <a href={s.url}>Apply on the official site ({domainOf(s.url)})</a>
      </p>
      {/* The long parts fold away, so a phone shows a scannable list (native <details>, no script). */}
      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
          {s.to_check.length > 0
            ? `Details and ${s.to_check.length} ${s.match === "open" ? "requirements" : s.to_check.length === 1 ? "thing to check" : "things to check"}`
            : "Details"}
        </summary>
        <p className="mt-2">{s.description}</p>
        {s.to_check.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold">{s.match === "open" ? "Requirements:" : "To check:"}</p>
            <ul className="mt-1 list-disc space-y-1 pl-6 text-sm">
              {s.to_check.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-2 text-sm text-muted">{checkedText(s.checked_at)}</p>
      </details>
    </li>
  );
}
