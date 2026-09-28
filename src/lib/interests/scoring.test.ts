import { describe, expect, it } from "vitest";
import { answersSchema, AREAS, rankAreas, resultsPath, scoreAnswers, scoresParamsSchema, type Area } from "./scoring";

// The 60-question order, as imported from O*NET: pairs of R, I, A, S, E, C, five times.
const areas: Area[] = Array.from({ length: 60 }, (_, i) => AREAS[Math.floor(i / 2) % 6]);

describe("scoreAnswers", () => {
  it("matches O*NET's own example (API v2 reference: answers and resulting scores)", () => {
    const answers = [..."553421321134342523523523254115342111351145453111231155343444"].map(Number);
    expect(scoreAnswers(answers, areas)).toEqual({
      realistic: 27,
      investigative: 13,
      artistic: 23,
      social: 25,
      enterprising: 14,
      conventional: 14,
    });
  });

  it("scores all Strongly dislike as 0 and all Strongly like as 40", () => {
    expect(scoreAnswers(Array(60).fill(1), areas).social).toBe(0);
    expect(scoreAnswers(Array(60).fill(5), areas).social).toBe(40);
  });
});

describe("validation", () => {
  it("needs exactly 60 answers from 1 to 5", () => {
    expect(answersSchema.safeParse(Array(60).fill(3)).success).toBe(true);
    expect(answersSchema.safeParse(Array(59).fill(3)).success).toBe(false);
    expect(answersSchema.safeParse([...Array(59).fill(3), 6]).success).toBe(false);
  });

  it("reads scores from the results URL and refuses bad ones", () => {
    const scores = { realistic: 27, investigative: 13, artistic: 23, social: 25, enterprising: 14, conventional: 14 };
    const params = Object.fromEntries(new URL(resultsPath(scores), "http://x").searchParams);
    expect(scoresParamsSchema.parse(params)).toEqual(scores);
    expect(scoresParamsSchema.safeParse({ ...params, r: "41" }).success).toBe(false);
    expect(scoresParamsSchema.safeParse({ ...params, r: "abc" }).success).toBe(false);
  });

  it("ranks areas highest first", () => {
    expect(rankAreas({ realistic: 27, investigative: 13, artistic: 23, social: 25, enterprising: 14, conventional: 14 }).slice(0, 3)).toEqual([
      "realistic",
      "social",
      "artistic",
    ]);
  });
});
