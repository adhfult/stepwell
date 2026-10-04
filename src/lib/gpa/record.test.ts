import { describe, expect, it } from "vitest";
import { EMPTY_RECORD, recordSchema } from "./record";

describe("recordSchema", () => {
  it("explains a cleared credits field in plain words", () => {
    const bad = { ...EMPTY_RECORD, courses: [{ name: "", type: "regular", grade: "A", credits: 0 }] };
    const out = recordSchema.safeParse(bad);
    expect(out.success).toBe(false);
    expect(out.error?.issues[0]?.message).toBe("Each class needs credits from 0.5 to 5");
  });

  it("refuses 81 classes and accepts the empty record", () => {
    const course = { name: "", type: "regular" as const, grade: null, credits: 1 };
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: Array(81).fill(course) }).success).toBe(false);
    expect(recordSchema.safeParse(EMPTY_RECORD).success).toBe(true);
  });
});
