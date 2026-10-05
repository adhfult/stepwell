import { describe, expect, it } from "vitest";
import type { SavedCourse } from "@/lib/gpa/record";
import { ASSOCIATIONS, checkCore, checkNaia, timelinePlanItems, TIMELINE } from "./rules";

const c = (core: SavedCourse["core"], grade: SavedCourse["grade"], year: SavedCourse["year"], credits = 1): SavedCourse => ({
  name: `${core} ${year}`,
  type: "regular",
  grade,
  credits,
  core,
  year,
});
// A full Division I set: 4 English, 3 math, 2 science, 1 extra science, 2 social, 4 other; all B.
const full: SavedCourse[] = [
  ...[9, 10, 11, 12].map((y) => c("english", "B", y as 9)),
  ...[9, 10, 11].map((y) => c("math", "B", y as 9)),
  ...[9, 10, 11].map((y) => c("science", "B", y as 9)),
  c("social", "B", 10), c("social", "B", 11),
  ...[9, 10, 11, 12].map((y) => c("other", "B", y as 9)),
];

describe("checkCore", () => {
  it("passes a complete Division I record", () => {
    const r = checkCore(full, ASSOCIATIONS.ncaa1.core!);
    expect(r.units).toBe(16);
    expect(r.gpa).toBe(3);
    expect(r.gaps).toEqual([]);
    expect(r.tenSeven).toEqual({ units: 14, ems: 9, ok: true });
  });
  it("names what is missing", () => {
    const r = checkCore(full.filter((x) => !(x.core === "math" && x.year === 11)), ASSOCIATIONS.ncaa1.core!);
    expect(r.gaps).toContain("1 more math");
  });
  it("says courses for more than one extra core course", () => {
    expect(checkCore([], ASSOCIATIONS.ncaa1.core!).gaps).toContain("4 more core courses");
  });
  it("counts surplus English, math or science toward the extra areas", () => {
    const r = checkCore([...full.filter((x) => x.core !== "other"), ...[1, 2, 3, 4].map(() => c("english", "B", 12))],
      ASSOCIATIONS.ncaa1.core!);
    expect(r.gaps).toEqual([]);
  });
  it("leaves unfinished classes out of the GPA and 10/7 but counts them as planned", () => {
    const r = checkCore([c("english", "A", 9), c("english", null, 11)], ASSOCIATIONS.ncaa1.core!);
    expect(r.gpa).toBe(4);
    expect(r.units).toBe(2);
    expect(r.tenSeven?.units).toBe(1);
  });
  it("lists core classes with no grade year", () => {
    expect(checkCore([c("english", "A", undefined)], ASSOCIATIONS.ncaa1.core!).untimed).toEqual(["english undefined"]);
  });
  it("is below the Division I minimum at a 2.19 core GPA; Division II has no 10/7 rule", () => {
    const low = full.map((x, i) => ({ ...x, grade: i < 3 ? ("B" as const) : ("C" as const) }));
    expect(checkCore(low, ASSOCIATIONS.ncaa1.core!).meetsGpa).toBe(false);
    expect(checkCore(low, ASSOCIATIONS.ncaa2.core!).tenSeven).toBeNull();
  });
  it("counts a half-credit class as half a year and caps a 5-credit class at one", () => {
    expect(checkCore([c("english", "A", 9, 0.5), c("math", "A", 9, 5)], ASSOCIATIONS.ncaa1.core!).units).toBe(1.5);
  });
});

describe("checkNaia", () => {
  it("meets with a 2.3 GPA alone", () => expect(checkNaia({ gpa: 2.3, sat: null, act: null, topHalf: null }).met).toBe(true));
  it("meets with two of three", () =>
    expect(checkNaia({ gpa: 2.0, sat: null, act: 18, topHalf: null }).met).toBe(true));
  it("does not meet with one of three", () =>
    expect(checkNaia({ gpa: 2.0, sat: 900, act: null, topHalf: false }).met).toBe(false));
  it("is unknown when the class-rank answer would decide it", () =>
    expect(checkNaia({ gpa: 2.1, sat: null, act: null, topHalf: null }).met).toBeNull());
});

describe("timelinePlanItems", () => {
  it("places steps in school years from the graduation year and skips ones already in the plan", () => {
    const items = timelinePlanItems("ncaa1", 2029, [], 2025);
    const first = TIMELINE.find((s) => s.assocs.includes("ncaa1"))!;
    expect(items[0]).toEqual({ title: first.title, kind: "task", academic_year: 2029 - 13 + first.grade, term: "full_year", due_on: null });
    expect(timelinePlanItems("ncaa1", 2029, items.map((i) => i.title), 2025)).toEqual([]);
  });

  it("moves steps from school years already over into this one", () => {
    // Graduating 2027, in 2026-27 (12th grade): 9th to 11th grade steps land in 2026.
    const years = timelinePlanItems("ncaa1", 2027, [], 2026).map((i) => i.academic_year);
    expect(new Set(years)).toEqual(new Set([2026]));
  });
});
