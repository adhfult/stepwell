import type { Metadata } from "next";
import Link from "next/link";
import { Band, Page, PageTitle } from "@/components/page";
import { getOnetSource, searchCareers } from "@/lib/careers/data";
import { searchQuerySchema } from "@/lib/careers/labels";
import { CareerList } from "./career-list";
import { CareerSearchForm } from "./search-form";
import { OnetSource } from "./source-line";

export const metadata: Metadata = { title: "Careers" };

const EXAMPLES = ["nurse", "electrician", "software developer", "graphic designer"];
const MAX_RESULTS = 30; // search_occupations() returns at most 30

export default async function CareersPage({ searchParams }: PageProps<"/careers">) {
  const raw = (await searchParams).q;
  const parsed = searchQuerySchema.safeParse(typeof raw === "string" ? raw : "");
  const query = parsed.success ? parsed.data : "";
  const error = parsed.success ? undefined : parsed.error.issues[0].message;

  const [results, source] = query ? await Promise.all([searchCareers(query), getOnetSource()]) : [null, null];

  return (
    <>
      <Band>
        <div className="max-w-2xl">
          <PageTitle>Careers</PageTitle>
          <p className="mt-4">
            Look up a career to see what the work is, what it takes, and which careers are related. The information
            comes from the U.S. Department of Labor.
          </p>
          <CareerSearchForm query={typeof raw === "string" ? raw : ""} error={error} />
        </div>
      </Band>
      <Page width="browse">
        {results === null && !error && <Examples />}
        {results && results.length === 0 && <NoResults query={query} />}
        {results && results.length > 0 && (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="text-lg font-bold">
              {results.length === MAX_RESULTS
                ? `Top ${MAX_RESULTS} careers for “${query}”`
                : `${results.length} ${results.length === 1 ? "career matches" : "careers match"} “${query}”`}
            </h2>
            <CareerList
              careers={results.map((r) => ({
                ...r,
                // Skip "Also called: Nurse" when the student searched "nurse": it adds nothing.
                note:
                  r.matched_title && r.matched_title.toLowerCase() !== query.toLowerCase()
                    ? `Also called: ${r.matched_title}`
                    : null,
              }))}
            />
            {source && <OnetSource release={source.release} retrievedAt={source.retrievedAt} />}
          </section>
        )}
      </Page>
    </>
  );
}

/** Empty state before a search: what to try, as links. */
function Examples() {
  return (
    <section aria-labelledby="examples-heading" className="mt-10 max-w-2xl">
      <h2 id="examples-heading" className="text-lg font-bold">
        Not sure where to start?
      </h2>
      <p className="mt-3">
        <Link href="/interests">Take the interest quiz</Link> to find careers that fit what you like to do, or try one
        of these:
      </p>
      <ul className="mt-2 space-y-1">
        {EXAMPLES.map((example) => (
          <li key={example}>
            <Link href={`/careers?q=${encodeURIComponent(example)}`} className="inline-flex min-h-11 items-center">
              {example.charAt(0).toUpperCase() + example.slice(1)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <section aria-labelledby="no-results-heading" className="mt-10 max-w-2xl">
      <h2 id="no-results-heading" className="text-lg font-bold">
        No careers match “{query}”
      </h2>
      <p className="mt-3">
        Try one word, or another name for the job. For example, “nurse” instead of “nursing job”.
      </p>
    </section>
  );
}
