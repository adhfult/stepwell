/**
 * Lists scholarship entries that need a person to re-check them
 * (docs/specs/scholarship-recheck.md): checked more than 11 months ago, or a
 * dated deadline that has passed. Exits 1 when any are due, so the monthly
 * workflow fails and GitHub emails the owner. No network use.
 */
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import type { Entry } from "./sources/official-list.ts";

/** Why an entry is due on `today` (YYYY-MM-DD), or null if it isn't. */
export function dueReason(e: Pick<Entry, "checked_at" | "deadline">, today: string): string | null {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 11);
  if (e.checked_at < cutoff.toISOString().slice(0, 10)) return `checked ${e.checked_at}`;
  if (e.deadline.kind === "date" && e.deadline.date < today) return `deadline ${e.deadline.date} passed`;
  return null;
}

function main() {
  const dir = new URL("../../data/scholarships/", import.meta.url);
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const entries = JSON.parse(readFileSync(new URL(file, dir), "utf8")) as Entry[];
    const due = entries.flatMap((e) => {
      const why = dueReason(e, today);
      return why ? [`  - ${e.title} (${why}): ${e.url}`] : [];
    });
    if (due.length) lines.push(`${file.replace(".json", "").toUpperCase()}`, ...due);
  }
  if (!lines.length) return console.log("No scholarship entries are due for a re-check.");
  const report = `Scholarship entries to re-check (see data/scholarships/README.md):\n\n${lines.join("\n")}\n`;
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${report}\`\`\`\n`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
