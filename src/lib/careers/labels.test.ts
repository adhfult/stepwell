import { describe, expect, it } from "vitest";
import { monthYear, onetCodeSchema, preparation, resultFacts, searchQuerySchema, typicalEducation } from "./labels";

describe("career labels", () => {
  it("names typical education with its share", () => {
    expect(typicalEducation(6, 62)).toBe("Bachelor's degree (62% of workers)");
    expect(typicalEducation(null, null)).toBeNull();
    expect(typicalEducation(99, 10)).toBeNull();
  });

  it("describes preparation in plain words", () => {
    expect(preparation(3)?.name).toBe("Medium preparation");
    expect(preparation(null)).toBeNull();
  });

  it("builds one line of facts from whatever is known", () => {
    expect(resultFacts(6, 4)).toBe("Bachelor's degree, considerable preparation");
    expect(resultFacts(null, 2)).toBe("Some preparation");
    expect(resultFacts(null, null)).toBeNull();
  });

  it("formats the retrieved month", () => {
    expect(monthYear("2026-09-28T20:56:51Z")).toBe("September 2026");
  });

  it("accepts only O*NET codes", () => {
    expect(onetCodeSchema.safeParse("29-1141.00").success).toBe(true);
    expect(onetCodeSchema.safeParse("29-1141").success).toBe(false);
    expect(onetCodeSchema.safeParse("../etc").success).toBe(false);
  });

  it("trims search queries and caps their length", () => {
    expect(searchQuerySchema.parse("  nurse ")).toBe("nurse");
    expect(searchQuerySchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});
