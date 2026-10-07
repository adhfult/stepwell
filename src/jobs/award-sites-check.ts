/**
 * Checks that every local scholarship link (data/award-sites/) still answers
 * (spec more-scholarships.md). One polite GET per link; exits 1 when any link
 * is broken, so the monthly workflow fails and GitHub emails the owner.
 */
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { createPoliteFetcher, type FetchResult, RobotsDisallowedError, userAgentFor } from "./fetch/polite.ts";

/** What's wrong with a link's answer, or null when it's fine. */
export function linkProblem(result: FetchResult | Error): string | null {
  if (result instanceof RobotsDisallowedError) return "not checked (robots.txt)";
  if (result instanceof Error) return `failed: ${result.message}`;
  return result.status === 200 ? null : `answered ${result.status}`;
}

async function main() {
  const fetcher = createPoliteFetcher({ userAgent: userAgentFor(process.env.IMPORT_CONTACT), maxRetries: 1 });
  const dir = new URL("../../data/award-sites/", import.meta.url);
  const lines: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    for (const site of JSON.parse(readFileSync(new URL(file, dir), "utf8")) as { id: string; url: string }[]) {
      const problem = linkProblem(await fetcher.get(site.url).catch((e: Error) => e));
      if (problem) lines.push(`  - ${site.id} (${problem}): ${site.url}`);
    }
  }
  if (!lines.length) return console.log("Every local scholarship link answers.");
  const report = `Local scholarship links to fix in data/award-sites/:\n\n${lines.join("\n")}\n`;
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${report}\`\`\`\n`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
