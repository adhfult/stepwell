import { z } from "zod";
import { COURSE_TYPES, type Course, DEFAULT_WEIGHTS, GRADES, type Start, type Weights } from "./gpa";

/** What /gpa edits and saves; the same limits as academic_records' checks. */
export type AcademicRecord = { courses: Course[]; weights: Weights; start: Start; sat: number | null; act: number | null };

export const EMPTY_RECORD: AcademicRecord = {
  courses: [],
  weights: DEFAULT_WEIGHTS,
  start: { unweighted: null, weighted: null, credits: 0 },
  sat: null,
  act: null,
};

export const MAX_COURSES = 80;
export const CONSENT_VERSION = 1;

const halfStep = (n: number) => Number.isInteger(n * 2);
const weight = z.number().min(0).max(1);
const startGpa = z.number().min(0).max(5).nullable();

export const recordSchema = z.object({
  courses: z
    .array(
      z.object({
        name: z.string().trim().max(80, "Class names can be up to 80 characters"),
        type: z.enum(COURSE_TYPES),
        grade: z.enum(GRADES).nullable(),
        credits: z.number().min(0.5).max(5).refine(halfStep, "Credits go in steps of 0.5"),
      }),
    )
    .max(MAX_COURSES, `Up to ${MAX_COURSES} classes`),
  weights: z.object({ honors: weight, ap: weight, ib: weight, dual: weight }),
  start: z.object({ unweighted: startGpa, weighted: startGpa, credits: z.number().min(0).max(80) }),
  sat: z.number().int().min(400).max(1600).refine((n) => n % 10 === 0, "SAT scores go in steps of 10").nullable(),
  act: z.number().int().min(1).max(36).nullable(),
});

/** A row from academic_records back into what the page edits (numeric columns arrive as strings or numbers). */
export function fromRow(row: {
  courses: unknown;
  weight_honors: number | string | null;
  weight_ap: number | string | null;
  weight_ib: number | string | null;
  weight_dual: number | string | null;
  start_unweighted: number | string | null;
  start_weighted: number | string | null;
  start_credits: number | string;
  sat: number | null;
  act: number | null;
}): AcademicRecord {
  const num = (v: number | string | null) => (v === null ? null : Number(v));
  return {
    courses: row.courses as Course[],
    weights: {
      honors: num(row.weight_honors) ?? DEFAULT_WEIGHTS.honors,
      ap: num(row.weight_ap) ?? DEFAULT_WEIGHTS.ap,
      ib: num(row.weight_ib) ?? DEFAULT_WEIGHTS.ib,
      dual: num(row.weight_dual) ?? DEFAULT_WEIGHTS.dual,
    },
    start: {
      unweighted: num(row.start_unweighted),
      weighted: num(row.start_weighted),
      credits: Number(row.start_credits),
    },
    sat: row.sat,
    act: row.act,
  };
}
