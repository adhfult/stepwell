/**
 * College athletics academic rules and the timeline (spec ncaa-athlete-path.md,
 * decision 0014). Stepwell's summary, not the associations' text: each rule
 * keeps the page it was confirmed on and when. Review every August, when the
 * NCAA guide for the new year comes out.
 */
import { type Grade, gpa } from "@/lib/gpa/gpa";
import type { CoreArea, SavedCourse } from "@/lib/gpa/record";

export type Assoc = "ncaa1" | "ncaa2" | "ncaa3" | "naia" | "juco";

/** Required years by area. "ems" is extra English, math or science; "any" is extra from any core area. */
export type CoreRule = {
  need: { english: number; math: number; science: number; ems: number; social: number; any: number };
  minGpa: number;
  tenSeven: boolean;
};

type Association = {
  name: string;
  summary: string;
  decides: { name: string; url: string };
  source: string;
  checked: string;
  core?: CoreRule;
};

const CBSA = "http://fs.ncaa.org/Docs/eligibility_center/Student_Resources/CBSA.pdf";
const NCAA_EC = { name: "NCAA Eligibility Center", url: "https://www.ncaa.org/eligibility-center/" };

export const ASSOCIATIONS: Record<Assoc, Association> = {
  ncaa1: {
    name: "NCAA Division I",
    summary:
      "16 core courses: 4 years of English, 3 of math (Algebra I or higher), 2 of natural or physical science, 1 more of English, math or science, 2 of social science and 4 more core courses. 10 of them, 7 in English, math or science, finished before your senior year. A core-course GPA of at least 2.3. No test scores needed since 2023.",
    decides: NCAA_EC,
    source: "https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-i/",
    checked: "2026-10-04",
    core: { need: { english: 4, math: 3, science: 2, ems: 1, social: 2, any: 4 }, minGpa: 2.3, tenSeven: true },
  },
  ncaa2: {
    name: "NCAA Division II",
    summary:
      "16 core courses: 3 years of English, 2 of math (Algebra I or higher), 2 of natural or physical science, 3 more of English, math or science, 2 of social science and 4 more core courses. A core-course GPA of at least 2.2. No test scores needed since 2023.",
    decides: NCAA_EC,
    source: "https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-ii/",
    checked: "2026-10-04",
    core: { need: { english: 3, math: 2, science: 2, ems: 3, social: 2, any: 4 }, minGpa: 2.2, tenSeven: false },
  },
  ncaa3: {
    name: "NCAA Division III",
    summary:
      "Each Division III college sets its own academic standards, so there is no NCAA core-course check. Meet the college's admission requirements and ask its coaches. A free NCAA Profile Page is enough for most students.",
    decides: { name: "the college you apply to", url: "https://www.ncaa.org/eligibility-center/" },
    source: CBSA,
    checked: "2026-10-04",
  },
  naia: {
    name: "NAIA",
    summary:
      "No core courses. A high school GPA of at least 2.3, or two of these three: a GPA of at least 2.0, the top half of your graduating class, an ACT of 18 or SAT of 970 or higher.",
    decides: { name: "NAIA Eligibility Center", url: "https://www.naia.org/student-athletes/prospective/high-school-students/" },
    source: "https://copforum.naia.org/21-b-10-initial-eligibility/",
    checked: "2026-10-04",
  },
  juco: {
    name: "Junior and community colleges",
    summary:
      "No core courses or GPA minimum. The NJCAA asks for proof that you graduated from high school (your final transcript) or passed a state equivalency exam. In California (CCCAA), being admitted to the community college is enough, and you take at least 12 units during your season. Check with the college for its own rules.",
    decides: { name: "NJCAA", url: "https://www.njcaa.org/" },
    source:
      "https://media.ardorsportshub.com/files/404933495157163011/6b815aea7cf842719e5deeefd7dc9310-NJCAA-Handbook---Bylaws---2026-27-9-9-26.pdf",
    checked: "2026-10-04",
  },
};

// NCAA core GPA points (CBSA, checked 2026-10-04). Plus and minus count as the plain letter; a school-approved
// honors weighting is left out, so this estimate can only be lower than the official one.
const NCAA_POINTS: Record<Grade, number> = {
  "A+": 4, A: 4, "A-": 4, "B+": 3, B: 3, "B-": 3, "C+": 2, C: 2, "C-": 2, "D+": 1, D: 1, "D-": 1, F: 0,
};

// ponytail: a class counts at most one year whatever credits the school gives it; a school's
// approved-course list can still differ, which the page says.
const units = (c: SavedCourse) => Math.min(c.credits, 1);
const round2 = (n: number) => Math.round(n * 100) / 100;

export type CoreResult = {
  units: number;
  gpa: number | null;
  meetsGpa: boolean | null;
  gaps: string[];
  tenSeven: { units: number; ems: number; ok: boolean } | null;
  untimed: string[];
};

const AREA_WORDS: Record<keyof CoreRule["need"], string> = {
  english: "English",
  math: "math",
  science: "science",
  ems: "English, math or science",
  social: "social science",
  any: "core course",
};

/** Core-course totals by area (planned classes included), core GPA and the 10/7 rule (finished classes only). */
export function checkCore(courses: SavedCourse[], rule: CoreRule): CoreResult {
  const core = courses.filter((c): c is SavedCourse & { core: CoreArea } => c.core !== undefined);
  const have = (area: CoreArea) => core.filter((c) => c.core === area).reduce((sum, c) => sum + units(c), 0);
  const { need } = rule;

  // Surplus English, math or science fills the "ems" years, then any surplus fills "any".
  const ems = Math.max(0, have("english") - need.english) + Math.max(0, have("math") - need.math) + Math.max(0, have("science") - need.science);
  const surplus = Math.max(0, ems - need.ems) + Math.max(0, have("social") - need.social) + have("other");
  const got = {
    english: Math.min(have("english"), need.english),
    math: Math.min(have("math"), need.math),
    science: Math.min(have("science"), need.science),
    ems: Math.min(ems, need.ems),
    social: Math.min(have("social"), need.social),
    any: Math.min(surplus, need.any),
  };
  const gaps = (Object.keys(need) as (keyof CoreRule["need"])[])
    .filter((area) => got[area] < need[area])
    .map((area) => {
      const n = round2(need[area] - got[area]);
      return `${n} more ${AREA_WORDS[area]}${area === "any" && n > 1 ? "s" : ""}`;
    });

  const graded = core.filter((c) => c.grade !== null);
  const credits = graded.reduce((sum, c) => sum + units(c), 0);
  const coreGpa = credits ? round2(graded.reduce((sum, c) => sum + NCAA_POINTS[c.grade as Grade] * units(c), 0) / credits) : null;

  const early = graded.filter((c) => c.year !== undefined && c.year <= 11);
  const earlyUnits = early.reduce((sum, c) => sum + units(c), 0);
  const earlyEms = early.filter((c) => c.core === "english" || c.core === "math" || c.core === "science").reduce((sum, c) => sum + units(c), 0);

  return {
    units: core.reduce((sum, c) => sum + units(c), 0),
    gpa: coreGpa,
    meetsGpa: coreGpa === null ? null : coreGpa >= rule.minGpa,
    gaps,
    tenSeven: rule.tenSeven ? { units: earlyUnits, ems: earlyEms, ok: earlyUnits >= 10 && earlyEms >= 7 } : null,
    untimed: core.filter((c) => c.year === undefined).map((c) => c.name),
  };
}

export type NaiaInput = { gpa: number | null; sat: number | null; act: number | null; topHalf: boolean | null };

/** true / false, or null when an unanswered class-rank question would decide it. */
export function checkNaia({ gpa: g, sat, act, topHalf }: NaiaInput): { met: boolean | null } {
  if (g !== null && g >= 2.3) return { met: true };
  const known = [g !== null && g >= 2.0, (act ?? 0) >= 18 || (sat ?? 0) >= 970].filter(Boolean).length;
  if (topHalf === true) return { met: known + 1 >= 2 };
  if (known >= 2) return { met: true };
  return { met: topHalf === null && known === 1 ? null : false };
}

/** The overall unweighted GPA the NAIA check uses, from /gpa's math. */
export const overallGpa = (r: { courses: SavedCourse[]; weights: Parameters<typeof gpa>[1]; start: Parameters<typeof gpa>[2] }) =>
  gpa(r.courses, r.weights, r.start, "unweighted");

export type Step = { grade: 9 | 10 | 11 | 12; title: string; assocs: Assoc[]; url: string };

const NCAA: Assoc[] = ["ncaa1", "ncaa2"];
const ALL: Assoc[] = ["ncaa1", "ncaa2", "ncaa3", "naia", "juco"];

/** Confirmed steps only (spec, "Rules checked"). Titles are what lands in the plan, so keep them under 200 characters. */
export const TIMELINE: Step[] = [
  { grade: 9, title: "Ask your counselor for your school’s list of NCAA-approved core courses", assocs: NCAA, url: "https://web3.ncaa.org/hsportal/exec/hsAction" },
  { grade: 9, title: "Make a free NCAA Profile Page at the Eligibility Center", assocs: ["ncaa1", "ncaa2", "ncaa3"], url: NCAA_EC.url },
  { grade: 10, title: "Check your core courses are on track for your division", assocs: NCAA, url: NCAA_EC.url },
  { grade: 10, title: "Look up your sport’s recruiting calendar and contact rules", assocs: ALL, url: "https://www.ncaa.org/eligibility-center/recruiting/" },
  { grade: 11, title: "Register for an NCAA certification account before any official visit", assocs: NCAA, url: NCAA_EC.url },
  { grade: 11, title: "Register with the NAIA Eligibility Center", assocs: ["naia"], url: ASSOCIATIONS.naia.decides.url },
  { grade: 11, title: "Finish 10 core courses, 7 in English, math or science, before senior year", assocs: ["ncaa1"], url: ASSOCIATIONS.ncaa1.source },
  { grade: 12, title: "Finish your core courses and send your final transcript with proof of graduation", assocs: NCAA, url: NCAA_EC.url },
  { grade: 12, title: "Compare athletics aid agreement offers with your family before you sign one", assocs: NCAA, url: CBSA },
];

/** The timeline as plan rows for one association, skipping titles already in the plan. */
export function timelinePlanItems(assoc: Assoc, gradYear: number, existing: string[]) {
  const have = new Set(existing);
  return TIMELINE.filter((s) => s.assocs.includes(assoc) && !have.has(s.title)).map((s) => ({
    title: s.title,
    kind: "task" as const,
    // A school year is named by the year it starts; 12th grade starts the year before graduation.
    academic_year: gradYear - 13 + s.grade,
    term: "full_year" as const,
    due_on: null,
  }));
}
