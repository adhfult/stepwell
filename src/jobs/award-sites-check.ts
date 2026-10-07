/**
 * Checks that every local scholarship link (data/award-sites/) still answers
 * (spec more-scholarships.md). One polite GET per link; exits 1 when any link
 * is broken, so the monthly workflow fails and GitHub emails the owner.
 * With a URL (`npm run award-sites:check -- <url>`) it tries just that link and
 * prints where it lands and its title, to vet a candidate before adding it.
 */
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { createPoliteFetcher, type FetchResult, RobotsDisallowedError, userAgentFor } from "./fetch/polite.ts";

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/**
 * What's wrong with a link's answer, or null when it's fine. Landing on another site counts:
 * retired portals (e.g. <college>.academicworks.com) redirect to a marketing page that answers 200.
 */
export function linkProblem(result: FetchResult | Error, url?: string): string | null {
  if (result instanceof RobotsDisallowedError) return "not checked (robots.txt)";
  if (result instanceof Error) return `failed: ${result.message}`;
  if (result.status !== 200) return `answered ${result.status}`;
  return url && host(result.finalUrl) !== host(url) ? `lands on another site: ${result.finalUrl}` : null;
}

/** The page's <title>, to spot a donor or news page before linking it. */
export const pageTitle = (html: string) => html.match(/<title[^>]*>([^<]*)</i)?.[1].trim().replace(/\s+/g, " ") || null;

async function main(url?: string) {
  const fetcher = createPoliteFetcher({ userAgent: userAgentFor(process.env.IMPORT_CONTACT), maxRetries: 1 });
  if (url) {
    const result = await fetcher.get(url).catch((e: Error) => e);
    const problem = linkProblem(result, url);
    console.log(problem ?? "answers 200");
    if (!(result instanceof Error)) console.log(`lands on: ${result.finalUrl}\ntitle: ${pageTitle(result.body) ?? "none"}`);
    if (problem) process.exitCode = 1;
    return;
  }
  const dir = new URL("../../data/award-sites/", import.meta.url);
  const lines: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    for (const site of JSON.parse(readFileSync(new URL(file, dir), "utf8")) as { id: string; url: string }[]) {
      const problem = linkProblem(await fetcher.get(site.url).catch((e: Error) => e), site.url);
      if (problem) lines.push(`  - ${site.id} (${problem}): ${site.url}`);
    }
  }
  if (!lines.length) return console.log("Every local scholarship link answers.");
  const report = `Local scholarship links to fix in data/award-sites/:\n\n${lines.join("\n")}\n`;
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${report}\`\`\`\n`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv[2]);
