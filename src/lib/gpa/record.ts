import { z } from "zod";
import { COURSE_TYPES, type Course, DEFAULT_WEIGHTS, GRADES, type Start, type Weights } from "./gpa";

/** Athlete tags on a class (decision 0014): its core-course area and the grade it was taken in. */
export const CORE_AREAS = ["english", "math", "science", "social", "other"] as const;
export type CoreArea = (typeof CORE_AREAS)[number];
export type SavedCourse = Course & { core?: CoreArea; year?: 9 | 10 | 11 | 12 };

/** What /gpa edits and saves; the same limits as academic_records' checks. */
export type AcademicRecord = { courses: SavedCourse[]; weights: Weights; start: Start; sat: number | null; act: number | null };

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
const weight = z.number().min(0, "Class bonuses go from 0 to 1").max(1, "Class bonuses go from 0 to 1");
const startGpa = z.number().min(0, "A GPA goes from 0 to 5").max(5, "A GPA goes from 0 to 5").nullable();

export const courseSchema = z.object({
  name: z.string().trim().max(80, "Class names can be up to 80 characters"),
  type: z.enum(COURSE_TYPES),
  grade: z.enum(GRADES).nullable(),
  credits: z
    .number()
    .min(0.5, "Each class needs credits from 0.5 to 5")
    .max(5, "Each class needs credits from 0.5 to 5")
    .refine(halfStep, "Credits go in steps of 0.5"),
  core: z.enum(CORE_AREAS).optional(),
  year: z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]).optional(),
});

export const recordSchema = z.object({
  courses: z.array(courseSchema).max(MAX_COURSES, `Up to ${MAX_COURSES} classes`),
  weights: z.object({ honors: weight, ap: weight, ib: weight, dual: weight }),
  start: z.object({ unweighted: startGpa, weighted: startGpa, credits: z.number().min(0, "Credits so far go from 0 to 80").max(80, "Credits so far go from 0 to 80") }),
  sat: z.number().int().min(400, "SAT totals go from 400 to 1600").max(1600, "SAT totals go from 400 to 1600").refine((n) => n % 10 === 0, "SAT scores go in steps of 10").nullable(),
  act: z.number().int().min(1, "ACT composites go from 1 to 36").max(36, "ACT composites go from 1 to 36").nullable(),
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
    courses: row.courses as SavedCourse[],
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
