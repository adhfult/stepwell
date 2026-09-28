import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { getOnetSource, searchCareers, type SearchResult } from "@/lib/careers/data";
import { resultFacts, searchQuerySchema } from "@/lib/careers/labels";
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
    <Page width="browse">
      <div className="max-w-2xl">
        <PageTitle>Careers</PageTitle>
        <p className="mt-4">
          Look up a career to see what the work is, what it takes, and which careers are related. The information
          comes from the U.S. Department of Labor.
        </p>
        <CareerSearchForm query={typeof raw === "string" ? raw : ""} error={error} />
      </div>

      {results === null && !error && <Examples />}
      {results && results.length === 0 && <NoResults query={query} />}
      {results && results.length > 0 && (
        <section aria-labelledby="results-heading" className="mt-10">
          <h2 id="results-heading" className="text-lg font-bold">
            {results.length === MAX_RESULTS
              ? `Top ${MAX_RESULTS} careers for “${query}”`
              : `${results.length} ${results.length === 1 ? "career matches" : "careers match"} “${query}”`}
          </h2>
          <ResultList results={results} query={query} />
          {source && <OnetSource release={source.release} retrievedAt={source.retrievedAt} />}
        </section>
      )}
    </Page>
  );
}

/** A list with dividers (DESIGN.md "Panels and lists"): title link, one line of facts. */
function ResultList({ results, query }: { results: SearchResult[]; query: string }) {
  return (
    <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
      {results.map((r) => {
        const facts = resultFacts(r.education_level, r.job_zone);
        return (
          <li key={r.onet_code} className="py-4">
            <Link href={`/careers/${r.onet_code}`} className="font-heading text-lg font-bold">
              {r.title}
            </Link>
            {/* Skip "Also called: Nurse" when the student searched "nurse": it adds nothing. */}
            {r.matched_title && r.matched_title.toLowerCase() !== query.toLowerCase() && (
              <p className="mt-1 text-sm text-muted">Also called: {r.matched_title}</p>
            )}
            <p className="mt-1">{facts ?? <span className="text-muted">Education and preparation not reported</span>}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Empty state before a search: what to try, as links. */
function Examples() {
  return (
    <section aria-labelledby="examples-heading" className="mt-10 max-w-2xl">
      <h2 id="examples-heading" className="text-lg font-bold">
        Not sure where to start?
      </h2>
      <p className="mt-3">Try one of these:</p>
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
