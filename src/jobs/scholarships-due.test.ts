import { describe, expect, it } from "vitest";
import { dueReason } from "./scholarships-due.ts";

const unknown = { kind: "unknown" } as const;

describe("dueReason", () => {
  it("flags entries checked more than 11 months ago", () => {
    expect(dueReason({ checked_at: "2026-09-29", deadline: unknown }, "2027-08-29")).toBeNull();
    expect(dueReason({ checked_at: "2026-09-28", deadline: unknown }, "2027-08-29")).toBe("checked 2026-09-28");
  });
  it("flags dated deadlines once they pass", () => {
    const e = { checked_at: "2026-09-29", deadline: { kind: "date", date: "2026-10-01" } } as const;
    expect(dueReason(e, "2026-10-01")).toBeNull();
    expect(dueReason(e, "2026-10-02")).toBe("deadline 2026-10-01 passed");
  });
  it("leaves usual and rolling deadlines alone", () => {
    const e = { checked_at: "2026-09-29", deadline: { kind: "usually", month_day: "03-01" } } as const;
    expect(dueReason(e, "2027-04-01")).toBeNull();
  });
});
