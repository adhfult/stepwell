import { describe, expect, it } from "vitest";
import { type Course, DEFAULT_WEIGHTS as W, gpa, highest, needed, type Start } from "./gpa";

const none: Start = { unweighted: null, weighted: null, credits: 0 };
const c = (type: Course["type"], grade: Course["grade"], credits = 1): Course => ({ name: "", type, grade, credits });

describe("gpa", () => {
  it("averages by credits, unweighted and weighted", () => {
    const list = [c("regular", "A"), c("ap", "B"), c("honors", "B+", 0.5)];
    expect(gpa(list, W, none, "unweighted")).toBeCloseTo((4 + 3 + 3.3 * 0.5) / 2.5);
    expect(gpa(list, W, none, "weighted")).toBeCloseTo((4 + 4 + 3.8 * 0.5) / 2.5);
  });

  it("gives an F no bonus and skips unfinished classes", () => {
    expect(gpa([c("ap", "F"), c("regular", "A"), c("ap", null)], W, none, "weighted")).toBe(2);
  });

  it("returns null with nothing graded", () => {
    expect(gpa([c("ap", null)], W, none, "unweighted")).toBeNull();
  });

  it("folds in the shortcut, weighted falling back to unweighted", () => {
    const start = { unweighted: 3.5, weighted: null, credits: 10 };
    expect(gpa([c("regular", "A", 2)], W, start, "unweighted")).toBeCloseTo((35 + 8) / 12);
    expect(gpa([c("ap", "A", 2)], W, start, "weighted")).toBeCloseTo((35 + 10) / 12);
    expect(gpa([], W, { unweighted: 3.5, weighted: null, credits: 0 }, "unweighted")).toBeNull();
  });
});

describe("needed", () => {
  const start = { unweighted: 3.4, weighted: 3.8, credits: 12 };

  it("finds the lowest letter that reaches the target", () => {
    // (3.4*12 + 3x) / 15 >= 3.5  ->  x >= 3.9  ->  A
    expect(needed([c("regular", null, 3)], W, start, "unweighted", 3.5)).toEqual({ kind: "grade", grade: "A" });
    // (3.4*12 + 3x) / 15 >= 3.45  ->  x >= 3.65  ->  A-
    expect(needed([c("regular", null, 3)], W, start, "unweighted", 3.45)).toEqual({ kind: "grade", grade: "A-" });
  });

  it("counts the bonus on a weighted target", () => {
    // (3.8*12 + 3(x+1)) / 15 >= 3.9  ->  x >= 3.3  ->  B+
    expect(needed([c("ap", null, 3)], W, start, "weighted", 3.9)).toEqual({ kind: "grade", grade: "B+" });
  });

  it("says when any passing grade or no grade gets there", () => {
    expect(needed([c("regular", null)], W, start, "unweighted", 3)).toEqual({ kind: "any" });
    const out = needed([c("regular", null, 3)], W, start, "unweighted", 3.8);
    expect(out).toEqual({ kind: "unreachable", best: highest([c("regular", null, 3)], W, start, "unweighted") });
    expect(out?.kind === "unreachable" && out.best).toBeCloseTo(3.52);
  });

  it("returns null without unfinished classes", () => {
    expect(needed([c("regular", "A")], W, start, "unweighted", 3.5)).toBeNull();
  });
});
