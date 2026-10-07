/**
 * Research worklist for one state's local scholarship file (spec more-scholarships.md):
 * counties with no foundation yet, the biggest colleges not yet listed, and listed
 * unitids that aren't a Scorecard college in that state. Reads the LOCAL database.
 *   npm run award-sites:gaps -- TX
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type Site = { id: string; kind: "foundation" | "college"; unitid?: number; counties: string[] };
export type College = { unitid: number; name: string; city: string | null; website: string | null; students: number | null };

/** colleges: every Scorecard college in the state, biggest first. */
export function findGaps(sites: Site[], counties: string[][], colleges: College[]) {
  const covered = new Set(sites.flatMap((s) => (s.kind === "foundation" ? s.counties : [])));
  const listed = new Set(sites.map((s) => s.unitid));
  const known = new Set(colleges.map((c) => c.unitid));
  return {
    counties: counties.filter(([fips]) => !covered.has(fips)).map(([, name]) => name),
    colleges: colleges.filter((c) => !listed.has(c.unitid)),
    badUnitids: sites.filter((s) => s.unitid !== undefined && !known.has(s.unitid)).map((s) => s.id),
  };
}

function main(arg = "") {
  const state = arg.toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("Usage: npm run award-sites:gaps -- TX");
  const root = new URL("../../", import.meta.url);
  const file = new URL(`data/award-sites/${state.toLowerCase()}.json`, root);
  const sites: Site[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  const counties: string[][] = JSON.parse(readFileSync(new URL("data/counties.json", root), "utf8"))[state] ?? [];
  // state is two letters (checked above), so it is safe inside the SQL.
  const sql = `select unitid, name, city, website, students from institutions where state = '${state}' order by students desc nulls last`;
  const out = execFileSync("npx", ["supabase", "db", "query", "--local", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const colleges: College[] = JSON.parse(out.slice(out.indexOf("{"))).rows;
  if (!colleges.length) throw new Error(`No ${state} colleges in the local database. Is it running (npm run db:start)?`);

  const gaps = findGaps(sites, counties, colleges);
  console.log(`${state}: ${sites.length} entries in data/award-sites/${state.toLowerCase()}.json\n`);
  console.log(`Counties with no foundation (${gaps.counties.length} of ${counties.length}):\n  ${gaps.counties.join(", ") || "none"}\n`);
  // ponytail: top 25 only; the biggest colleges matter most, rerun after adding some.
  console.log(`Colleges not listed (${gaps.colleges.length}), biggest first:`);
  for (const c of gaps.colleges.slice(0, 25))
    console.log(`  ${c.unitid}  ${c.name} (${c.city ?? "?"}), ${c.students ?? "?"} students, ${c.website ?? "no website"}`);
  if (gaps.badUnitids.length) {
    console.log(`\nNot a ${state} college in Scorecard: ${gaps.badUnitids.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv[2]);
