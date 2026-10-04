/**
 * GPA math (spec gpa-and-tests.md). Pure: the /gpa page runs it live in the
 * browser and the save action reuses the types and limits.
 */

/** Lowest first, so the needed-grade search can stop at the first letter that works. */
export const GRADES = ["F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"] as const;
export type Grade = (typeof GRADES)[number];

const POINTS: Record<Grade, number> = {
  "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, "C-": 1.7, "D+": 1.3, D: 1, "D-": 0.7, F: 0,
};

export const COURSE_TYPES = ["regular", "honors", "ap", "ib", "dual"] as const;
export type CourseType = (typeof COURSE_TYPES)[number];
export type Weights = Record<Exclude<CourseType, "regular">, number>;

/** Common U.S. high school practice; students can change these for their school. */
export const DEFAULT_WEIGHTS: Weights = { honors: 0.5, ap: 1, ib: 1, dual: 1 };

/** grade null = not finished yet; those are the classes the what-ifs solve for. */
export type Course = { name: string; type: CourseType; grade: Grade | null; credits: number };

/** The "I already know my GPA" shortcut: earlier classes folded into one entry. */
export type Start = { unweighted: number | null; weighted: number | null; credits: number };

export type Scale = "unweighted" | "weighted";

const points = (grade: Grade, type: CourseType, weights: Weights, scale: Scale) =>
  POINTS[grade] + (scale === "weighted" && type !== "regular" && grade !== "F" ? weights[type] : 0);

/** Credit-weighted GPA over graded classes plus the shortcut; null when there's nothing to average. */
export function gpa(courses: Course[], weights: Weights, start: Start, scale: Scale): number | null {
  // A weighted start left blank falls back to the unweighted one (no weighted classes before).
  const startGpa = scale === "weighted" ? (start.weighted ?? start.unweighted) : start.unweighted;
  const useStart = startGpa !== null && start.credits > 0;
  let sum = useStart ? startGpa * start.credits : 0;
  let credits = useStart ? start.credits : 0;
  for (const c of courses) {
    if (c.grade === null || c.credits <= 0) continue;
    sum += points(c.grade, c.type, weights, scale) * c.credits;
    credits += c.credits;
  }
  return credits > 0 ? sum / credits : null;
}

const withUnfinished = (courses: Course[], grade: Grade) =>
  courses.map((c) => (c.grade === null ? { ...c, grade } : c));

export type Needed =
  | { kind: "grade"; grade: Grade }
  | { kind: "any" }
  | { kind: "unreachable"; best: number };

/**
 * The lowest letter that, earned in every unfinished class, reaches the
 * target; null without unfinished classes. Floating-point sums get a small
 * tolerance so 3.6 isn't missed by 0.0000001.
 */
export function needed(courses: Course[], weights: Weights, start: Start, scale: Scale, target: number): Needed | null {
  if (!courses.some((c) => c.grade === null && c.credits > 0)) return null;
  const reaches = (grade: Grade) => (gpa(withUnfinished(courses, grade), weights, start, scale) ?? 0) >= target - 1e-9;
  if (reaches("D-")) return { kind: "any" };
  const grade = GRADES.find(reaches);
  if (!grade) return { kind: "unreachable", best: highest(courses, weights, start, scale) ?? 0 };
  return { kind: "grade", grade };
}

/** The GPA with an A in every unfinished class. */
export const highest = (courses: Course[], weights: Weights, start: Start, scale: Scale) =>
  gpa(withUnfinished(courses, "A"), weights, start, scale);
