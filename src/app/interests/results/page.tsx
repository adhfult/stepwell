import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { preparation } from "@/lib/careers/labels";
import { getMyInterestResults, matchCareers } from "@/lib/interests/data";
import { AREA_TEXT, listNames } from "@/lib/interests/labels";
import { AREAS, rankAreas, resultsPath, scoresParamsSchema, type Scores } from "@/lib/interests/scoring";
import { buttonClass } from "@/components/button-styles";
import { CareerList } from "../../careers/career-list";
import { InterestSource } from "../source-line";
import { SaveResultsForm } from "./save-form";

export const metadata: Metadata = { title: "Your interests" };

const zoneSchema = z.coerce.number().int().min(1).max(5).optional().catch(undefined);
// Phones get a short list first (a long list is clutter); the rest is one tap away.
const FIRST_MATCHES = 10;

export default async function InterestResultsPage({ searchParams }: PageProps<"/interests/results">) {
  const params = await searchParams;
  const parsed = scoresParamsSchema.safeParse(params);

  if (!parsed.success) {
    return (
      <Page>
        <PageTitle>Your interests</PageTitle>
        <p className="mt-4">These results don’t look right. The link may be incomplete.</p>
        <p className="mt-4">
          <Link href="/interests">Take the interest quiz</Link>
        </p>
      </Page>
    );
  }

  const scores = parsed.data;
  const zone = zoneSchema.parse(params.zone) ?? null;
  const showAll = params.more === "1";
  const ranked = rankAreas(scores);
  const [careers, user, saved] = await Promise.all([matchCareers(scores, zone), getCurrentUser(), getMyInterestResults()]);
  const isSaved = Boolean(saved && AREAS.every((a) => saved[a] === scores[a]));

  return (
    <Page>
      <PageTitle>Your interests</PageTitle>
      <p className="mt-4 text-lg">
        Your top interests: <strong>{listNames(ranked.slice(0, 3))}</strong>.
      </p>

      {user ? (
        <SaveResultsForm scores={scores} saved={isSaved} />
      ) : (
        <p className="mt-4">
          <Link href={`/sign-in?next=${encodeURIComponent(resultsPath(scores))}`}>Sign in to save your results</Link>
        </p>
      )}

      <section aria-labelledby="areas-heading" className="mt-12">
        <h2 id="areas-heading" className="text-lg font-bold">
          All six areas
        </h2>
        <ol className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
          {ranked.map((area) => (
            <li key={area} className="py-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-heading font-bold">{AREA_TEXT[area].name}</h3>
                <p className="shrink-0 text-sm">{scores[area]} out of 40</p>
              </div>
              <ScoreBar score={scores[area]} />
              <p className="mt-2">{AREA_TEXT[area].description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="matches-heading" className="mt-12">
        <h2 id="matches-heading" className="text-lg font-bold">
          Careers that match your interests
        </h2>
        <ZoneFilter scores={scores} zone={zone} />
        {careers.length > 0 ? (
          <>
            <CareerList careers={showAll ? careers : careers.slice(0, FIRST_MATCHES)} />
            {!showAll && careers.length > FIRST_MATCHES && (
              <p className="mt-4">
                <Link href={resultsPath(scores, `${zone ? `&zone=${zone}` : ""}&more=1`)}>
                  Show all {careers.length} matches
                </Link>
              </p>
            )}
          </>
        ) : (
          <NoMatches scores={scores} zone={zone} />
        )}
      </section>

      <InterestSource />
    </Page>
  );
}

/**
 * A plain bar: an SVG, because the content security policy blocks inline
 * style attributes (so no style="width: ..."). The words beside it carry the
 * number; the bar only helps the eye.
 */
function ScoreBar({ score }: { score: number }) {
  return (
    <svg viewBox="0 0 40 2" preserveAspectRatio="none" aria-hidden="true" className="mt-2 block h-2 w-full">
      <rect width="40" height="2" className="fill-border-subtle" />
      <rect width={score} height="2" className="fill-primary" />
    </svg>
  );
}

/** GET form: the scores ride along as hidden fields, so the URL keeps everything. */
function ZoneFilter({ scores, zone }: { scores: Scores; zone: number | null }) {
  const hidden = { r: scores.realistic, i: scores.investigative, a: scores.artistic, s: scores.social, e: scores.enterprising, c: scores.conventional };
  return (
    <form action="/interests/results" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="sm:flex-1">
        <label htmlFor="zone" className="block font-bold">
          How much preparation?
        </label>
        <select
          id="zone"
          name="zone"
          defaultValue={zone ?? ""}
          className="mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground"
        >
          <option value="">Any amount</option>
          {[1, 2, 3, 4, 5].map((z) => (
            <option key={z} value={z}>
              {preparation(z)?.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={`${buttonClass("secondary")} justify-center`}>
        Show careers
      </button>
    </form>
  );
}

function NoMatches({ scores, zone }: { scores: Scores; zone: number | null }) {
  const flat = AREAS.every((a) => scores[a] === scores.realistic);
  return (
    <div className="mt-6">
      <h3 className="font-heading font-bold">No careers to show</h3>
      <p className="mt-2">
        {flat
          ? "You scored every area the same, so there’s no pattern to match. Try the quiz again with more likes and dislikes."
          : "No careers with that much preparation match your interests. Try another amount."}
      </p>
      <p className="mt-2">
        {flat || !zone ? <Link href="/interests">Take the quiz again</Link> : <Link href={resultsPath(scores)}>Show any amount of preparation</Link>}
      </p>
    </div>
  );
}
