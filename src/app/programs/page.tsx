import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { SaveButton } from "@/app/plan/save-button";
import { buttonClass } from "@/components/button-styles";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMySavedIds } from "@/lib/plan/data";
import { getMyProfile } from "@/lib/profile/data";
import { STATES, stateName } from "@/lib/profile/options";
import { listPrograms, type StudentProgram } from "@/lib/programs/data";
import { PROGRAM_KINDS, payLine } from "@/lib/programs/labels";
import { checkedText, deadlineText, domainOf } from "@/lib/scholarships/labels";

export const metadata: Metadata = { title: "Summer programs and research" };

const FIRST = 15; // phones get a short list first (a long list is clutter)

// The programs list's own stages (adult learners are "adult" there).
const STAGES = [
  { value: "middle_school", label: "Middle school" },
  { value: "high_school", label: "High school" },
  { value: "college", label: "College" },
  { value: "adult", label: "Adult learner" },
] as const;

const paramsSchema = z.object({
  state: z.enum(["all", ...STATES.map((s) => s.value)] as [string, ...string[]]).optional().catch(undefined),
  stage: z.enum(["any", ...STAGES.map((s) => s.value)] as [string, ...string[]]).optional().catch(undefined),
  more: z.literal("1").optional().catch(undefined),
});

export default async function ProgramsPage({ searchParams }: PageProps<"/programs">) {
  const params = paramsSchema.parse(await searchParams);
  const [user, profile, saved] = await Promise.all([getCurrentUser(), getMyProfile(), getMySavedIds()]);
  const profileStage = profile?.stage === "adult_learner" ? "adult" : profile?.stage;

  // Start from the student's profile; "all" / "any" means they cleared it on purpose.
  const state = params.state === "all" ? undefined : (params.state ?? profile?.state ?? undefined);
  const stage = params.stage === "any" ? undefined : (params.stage ?? profileStage ?? undefined);

  const programs = await listPrograms({ state, stage });
  const shown = params.more ? programs : programs.slice(0, FIRST);
  const moreHref = `/programs?${new URLSearchParams({ state: state ?? "all", stage: stage ?? "any", more: "1" })}`;

  return (
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle>Summer programs and research</PageTitle>
        <p className="mt-4">
          Free or paid programs run by federal agencies, national labs, states and public universities. They’re a way
          to try a field before you choose it. Every listing links to its official page, where you apply.
        </p>
        <Filters state={state} stage={stage} />
      </div>

      {programs.length > 0 ? (
        <section aria-labelledby="list-heading" className="mt-10">
          <h2 id="list-heading" className="text-lg font-bold">
            {programs.length} {programs.length === 1 ? "program" : "programs"}
            {state ? ` in ${stateName(state)} or open to every state` : ""}
          </h2>
          <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {shown.map((p) => (
              <Listing key={p.id} p={p} saved={user ? saved.programs.has(p.id) : null} />
            ))}
          </ul>
          {!params.more && programs.length > FIRST && (
            <p className="mt-4">
              <Link href={moreHref}>Show all {programs.length} programs</Link>
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="none-heading" className="mt-10 max-w-2xl">
          <h2 id="none-heading" className="text-lg font-bold">
            No programs match
          </h2>
          <p className="mt-3">Try another state or school stage.</p>
        </section>
      )}

      <p className="mt-8 max-w-2xl text-sm text-muted">
        Source: official federal, state and public university program pages, listed by Stepwell (each listing says when
        it was checked). Only programs that are free to attend or pay you are listed. For federal job postings, see{" "}
        <Link href="/internships">internships</Link>.
      </p>
    </Page>
  );
}

function Filters({ state, stage }: { state?: string; stage?: string }) {
  const select = "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";
  return (
    <form action="/programs" method="get" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="sm:flex-1">
        <label htmlFor="state" className="block font-bold">
          State
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

/** One program: what and who runs it, pay in words, the deadline; the rest folds away. */
function Listing({ p, saved }: { p: StudentProgram; saved: boolean | null }) {
  const deadline = deadlineText(p);
  const tone = deadline.tone === "urgent" ? "text-accent font-bold" : deadline.tone === "closed" ? "text-muted" : "";
  const where = p.remote ? "Remote" : p.states.length === 0 ? "Open to every state" : p.states.map(stateName).join(", ");
  return (
    <li className="py-5">
      <h3 className="font-heading text-lg font-bold">{p.title}</h3>
      <p className="mt-1 text-sm text-muted">
        {PROGRAM_KINDS[p.kind]}. {p.sponsor}. {where}.
      </p>
      <p className="mt-2">{payLine(p)}</p>
      <p className={`mt-1 ${tone}`}>{deadline.text}</p>
      <p className="mt-2">
        <a href={p.url}>Apply on the official site ({domainOf(p.url)})</a>
      </p>
      {saved !== null && <SaveButton kind="program" id={p.id} saved={saved} />}
      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">Details</summary>
        <p className="mt-2">{p.description}</p>
        {p.who_text && <p className="mt-2 text-sm">Who can apply: {p.who_text}</p>}
        <p className="mt-2 text-sm text-muted">{checkedText(p.checked_at)}</p>
      </details>
    </li>
  );
}
