import { describe, expect, it } from "vitest";
import {
  medianPay,
  monthYear,
  onetCodeSchema,
  outlookText,
  payRange,
  preparation,
  resultFacts,
  searchQuerySchema,
  typicalEducation,
} from "./labels";

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

describe("pay and outlook labels", () => {
  const annual = {
    annual_low: 40050,
    annual_median: 61010,
    annual_high: 95210,
    hourly_low: null,
    hourly_median: null,
    hourly_high: null,
    or_more: [],
  };
  const hourly = { ...annual, annual_low: null, annual_median: null, annual_high: null, hourly_low: 13.02, hourly_median: 23.94, hourly_high: 115, or_more: ["hourly_high"] };

  it("shows yearly pay in whole dollars", () => {
    expect(medianPay(annual)).toBe("$61,010 a year");
    expect(payRange(annual)).toBe("Most people in this job earn $40,050 to $95,210 a year.");
  });

  it("falls back to hourly pay with cents, and marks the BLS maximum", () => {
    expect(medianPay(hourly)).toBe("$23.94 an hour");
    expect(payRange(hourly)).toBe("Most people in this job earn $13.02 to $115.00 or more an hour.");
  });

  it("says nothing when there is no pay", () => {
    expect(medianPay(null)).toBeNull();
    expect(medianPay({ ...annual, annual_median: null })).toBeNull();
    expect(payRange({ ...annual, annual_low: null })).toBeNull();
  });

  it("explains the outlook and why it's bright", () => {
    expect(outlookText("bright", ["grow", "openings"])).toEqual({
      name: "Bright outlook",
      detail: "New jobs are very likely in the next few years. It will grow quickly. It will have many job openings.",
    });
    expect(outlookText("unknown", [])).toBeNull();
  });
});
