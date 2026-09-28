import { z } from "zod";

/**
 * O*NET Interest Profiler scoring (docs/specs/interest-quiz.md): each answer
 * (1 Strongly dislike to 5 Strongly like) counts 0 to 4, summed per area, so
 * each area scores 0 to 40. Checked against the example in O*NET's API v2
 * reference (see scoring.test.ts).
 */

export const AREAS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
export type Area = (typeof AREAS)[number];
export type Scores = Record<Area, number>;

export const QUESTION_COUNT = 60;

export const answersSchema = z.array(z.number().int().min(1).max(5)).length(QUESTION_COUNT);

/** `areas[i]` is the area of question i + 1, from interest_questions. */
export function scoreAnswers(answers: number[], areas: Area[]): Scores {
  const scores = Object.fromEntries(AREAS.map((a) => [a, 0])) as Scores;
  answers.forEach((value, i) => {
    scores[areas[i]] += value - 1;
  });
  return scores;
}

const score = z.coerce.number().int().min(0).max(40);

/** Scores in the results URL: ?r=27&i=13&a=23&s=25&e=14&c=14 */
export const scoresParamsSchema = z
  .object({ r: score, i: score, a: score, s: score, e: score, c: score })
  .transform(
    (p): Scores => ({
      realistic: p.r,
      investigative: p.i,
      artistic: p.a,
      social: p.s,
      enterprising: p.e,
      conventional: p.c,
    }),
  );

export function resultsPath(scores: Scores, extra = "") {
  const q = new URLSearchParams({
    r: String(scores.realistic),
    i: String(scores.investigative),
    a: String(scores.artistic),
    s: String(scores.social),
    e: String(scores.enterprising),
    c: String(scores.conventional),
  });
  return `/interests/results?${q}${extra}`;
}

/** Areas from highest to lowest score (ties keep O*NET's RIASEC order). */
export function rankAreas(scores: Scores): Area[] {
  return [...AREAS].sort((x, y) => scores[y] - scores[x]);
}
