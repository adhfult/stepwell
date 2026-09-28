import { describe, expect, it } from "vitest";
import { isAtLeast13 } from "./age";

// Mid-September 2026, UTC.
const today = new Date(Date.UTC(2026, 8, 15));

describe("isAtLeast13", () => {
  it("counts someone born in this month 13 years ago as under 13", () => {
    expect(isAtLeast13(9, 2013, today)).toBe(false);
  });

  it("accepts someone born last month 13 years ago", () => {
    expect(isAtLeast13(8, 2013, today)).toBe(true);
  });

  it("refuses someone who turns 13 next month", () => {
    expect(isAtLeast13(10, 2013, today)).toBe(false);
  });

  it("accepts adults", () => {
    expect(isAtLeast13(1, 1990, today)).toBe(true);
  });

  it("refuses a birth date in the future", () => {
    expect(isAtLeast13(12, 2026, today)).toBe(false);
  });

  it("handles the year boundary in January", () => {
    const january = new Date(Date.UTC(2026, 0, 10));
    expect(isAtLeast13(12, 2012, january)).toBe(true);
    expect(isAtLeast13(1, 2013, january)).toBe(false);
  });
});
