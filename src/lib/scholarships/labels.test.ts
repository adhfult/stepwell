import { describe, expect, it } from "vitest";
import { checkedText, deadlineText, eligibilitySchema } from "./labels";

const today = new Date(2026, 8, 28); // September 28, 2026 (local)
const listing = (over: object) => ({ deadline_kind: "unknown", deadline_date: null, deadline_month_day: null, checked_at: "2026-09-28", ...over });

describe("deadlineText", () => {
  it("follows DESIGN.md's deadline rules", () => {
    expect(deadlineText(listing({ deadline_kind: "date", deadline_date: "2026-10-02" }), today)).toEqual({ text: "Closes in 4 days (Oct 2)", tone: "urgent" });
    expect(deadlineText(listing({ deadline_kind: "date", deadline_date: "2026-09-29" }), today)).toEqual({ text: "Closes in 1 day (Sep 29)", tone: "urgent" });
    expect(deadlineText(listing({ deadline_kind: "date", deadline_date: "2026-09-28" }), today)).toEqual({ text: "Closes today (Sep 28)", tone: "urgent" });
    expect(deadlineText(listing({ deadline_kind: "date", deadline_date: "2026-03-01" }), today)).toEqual({ text: "Closed Mar 1", tone: "closed" });
    expect(deadlineText(listing({ deadline_kind: "date", deadline_date: "2027-03-02" }), today).text).toBe("Due Mar 2, 2027");
    expect(deadlineText(listing({ deadline_kind: "usually", deadline_month_day: "03-02" }), today).text).toBe("Usually due around March 2");
    expect(deadlineText(listing({ deadline_kind: "rolling" }), today).text).toBe("Apply any time (rolling)");
    expect(deadlineText(listing({}), today).text).toBe("Check the official page for the deadline");
  });

  it("sends students to the official page when a listing wasn't checked in 12 months", () => {
    const stale = listing({ deadline_kind: "usually", deadline_month_day: "03-02", checked_at: "2025-09-01" });
    expect(deadlineText(stale, today).text).toBe("Check the official page for this year's details");
  });

  it("says when a listing was checked", () => {
    expect(checkedText("2026-09-28")).toBe("Checked September 2026");
  });
});

describe("eligibilitySchema", () => {
  const form = { gpa: "3.4", fields: ["11"], first_generation: "prefer_not", citizenship: "", military_family: "no", plans_fafsa: "yes", consent: "yes" };

  it("turns blank and 'Prefer not to say' into no answer", () => {
    expect(eligibilitySchema.parse(form)).toEqual({ gpa: 3.4, fields: ["11"], first_generation: undefined, citizenship: undefined, military_family: "no", plans_fafsa: "yes", consent: "yes" });
    expect(eligibilitySchema.parse({ ...form, gpa: "" }).gpa).toBeUndefined();
  });

  it("refuses bad GPAs, unknown fields and missing consent", () => {
    expect(eligibilitySchema.safeParse({ ...form, gpa: "6" }).success).toBe(false);
    expect(eligibilitySchema.safeParse({ ...form, gpa: "abc" }).success).toBe(false);
    expect(eligibilitySchema.safeParse({ ...form, fields: ["99"] }).success).toBe(false);
    expect(eligibilitySchema.safeParse({ ...form, consent: undefined }).success).toBe(false);
  });
});
