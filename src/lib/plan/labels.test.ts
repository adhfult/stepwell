import { describe, expect, it } from "vitest";
import { bucket, collegeYear, planItemSchema, planYears, scholarshipYear, schoolYear, yearHeading } from "./labels";

describe("plan years", () => {
  it("starts a school year in July", () => {
    expect(schoolYear("2026-06-30")).toBe(2025);
    expect(schoolYear("2026-07-01")).toBe(2026);
  });
  it("labels grades from the graduation year", () => {
    // Graduates in spring 2029: senior year is 2028 to 2029.
    expect(yearHeading(2026, "high_school", 2029)).toBe("10th grade (2026 to 2027)");
    expect(yearHeading(2028, "high_school", 2029)).toBe("12th grade (2028 to 2029)");
    expect(yearHeading(2029, "high_school", 2029)).toBe("After high school (2029 on)");
    expect(yearHeading(2026, "college", 2028)).toBe("2026 to 2027");
    expect(yearHeading(2028, "college", 2028)).toBe("After college (2028 on)");
    expect(yearHeading(2026, "adult_learner", null)).toBe("2026 to 2027");
  });
  it("shows now through graduation, folding later years into the last", () => {
    expect(planYears(2026, "high_school", 2029, [2031])).toEqual([2026, 2027, 2028, 2029]);
    expect(bucket(2031, "high_school", 2029)).toBe(2029);
    expect(planYears(2026, "adult_learner", null, [2028, 2024])).toEqual([2024, 2026, 2028]);
  });
  it("places saved scholarships by their next deadline", () => {
    const base = { deadline_date: null, deadline_month_day: null };
    expect(scholarshipYear({ ...base, deadline_kind: "date", deadline_date: "2027-03-01" }, "2026-09-29")).toBe(2026);
    expect(scholarshipYear({ ...base, deadline_kind: "usually", deadline_month_day: "03-01" }, "2026-09-29")).toBe(2026);
    expect(scholarshipYear({ ...base, deadline_kind: "usually", deadline_month_day: "09-15" }, "2026-09-29")).toBe(2027);
    expect(scholarshipYear({ ...base, deadline_kind: "rolling" }, "2026-09-29")).toBe(2026);
    expect(collegeYear(2026, "high_school", 2029)).toBe(2028);
    expect(collegeYear(2026, "adult_learner", null)).toBe(2026);
  });
  it("validates plan items", () => {
    const ok = planItemSchema.parse({ title: " AP Bio ", kind: "class", academic_year: "2027", term: "fall", due_on: "" });
    expect(ok).toEqual({ title: "AP Bio", kind: "class", academic_year: 2027, term: "fall", due_on: null });
    expect(planItemSchema.safeParse({ title: " ", kind: "class", academic_year: "", term: "fall", due_on: "" }).success).toBe(false);
    expect(planItemSchema.safeParse({ title: "x", kind: "nope", academic_year: "", term: "fall", due_on: "" }).success).toBe(false);
  });
});
