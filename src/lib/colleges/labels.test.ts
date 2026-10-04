import { describe, expect, it } from "vitest";
import {
  collegeMeters,
  debtText,
  directorySchema,
  domainOf,
  earningsText,
  filtersSchema,
  ownershipName,
  fitText,
  testFit,
} from "./labels";

describe("college labels", () => {
  it("prefers 4-year earnings and says which figure it is", () => {
    expect(earningsText(52000, 40000)).toBe("Graduates earn $52,000 a year");
    expect(earningsText(null, 40000)).toBe("Graduates earn $40,000 a year (1 year after finishing)");
    expect(earningsText(null, null)).toBeNull();
  });

  it("formats money and rates, and says nothing when missing", () => {
    expect(debtText(24000)).toBe("Median federal loan debt $24,000");
    expect(ownershipName("private_nonprofit")).toBe("Private nonprofit");
  });

  it("shows a website as its domain", () => {
    expect(domainOf("https://www.aamu.edu")).toBe("www.aamu.edu");
    expect(domainOf(null)).toBeNull();
  });

  it("ignores unknown filter values instead of failing", () => {
    expect(filtersSchema.parse({ state: "OR", level: "bachelor" })).toEqual({ state: "OR", level: "bachelor" });
    expect(filtersSchema.parse({ state: "ZZ", level: "phd" })).toEqual({ state: undefined, level: undefined });
  });
});

describe("collegeMeters", () => {
  it("draws each number on its fixed scale and marks 1-year earnings", () => {
    const [earn, debt, price, grad] = collegeMeters({
      earnings_4yr: null,
      earnings_1yr: 75000,
      median_debt: 150000,
      net_price: 30000,
      graduation_rate: "0.64",
    });
    expect(earn).toMatchObject({ label: "Graduates earn (1 year after)", value: "$75,000 a year", percent: 50 });
    expect(debt).toMatchObject({ value: "$150,000", percent: 100 }); // over the cap: full bar, exact number
    expect(price).toMatchObject({ value: "$30,000 a year", percent: 50, phone: true });
    expect(grad).toMatchObject({ value: "64%", percent: 64, phone: true });
  });

  it("leaves out the bar when a number isn't reported", () => {
    const meters = collegeMeters({
      earnings_4yr: null,
      earnings_1yr: null,
      median_debt: null,
      net_price: null,
      graduation_rate: null,
    });
    expect(meters.every((m) => m.value === null && m.percent === null)).toBe(true);
  });
});

describe("directorySchema", () => {
  it("keeps good values and drops blank or malformed ones", () => {
    expect(directorySchema.parse({ q: " nurse ", type: "public", bracket: "2", max: "12000", sat: "1200", page: "3" }))
      .toMatchObject({ q: "nurse", type: "public", bracket: "2", max: 12000, sat: 1200, page: 3 });
    expect(directorySchema.parse({ max: "", sat: "300", act: "40", page: "0", type: "x", optional: "yes" })).toEqual({
      max: undefined,
      sat: undefined,
      act: undefined,
      page: undefined,
      type: undefined,
      optional: undefined,
      q: undefined,
      program: undefined,
      state: undefined,
      size: undefined,
      bracket: undefined,
      admit: undefined,
      setting: undefined,
      years: undefined,
      serves: undefined,
      sort: undefined,
    });
  });
});

describe("testFit", () => {
  const c = { sat_read_25: 500, sat_read_75: 600, sat_math_25: 510, sat_math_75: 620, act_25: 20, act_75: 27 };
  const fit = (r: typeof c, mine: { sat?: number; act?: number }) => testFit(r, mine)?.fit ?? null;

  it("places an SAT score against reading + math (1010 to 1220)", () => {
    expect(fit(c, { sat: 1000 })).toBe("below");
    expect(fit(c, { sat: 1010 })).toBe("in");
    expect(fit(c, { sat: 1220 })).toBe("in");
    expect(fit(c, { sat: 1230 })).toBe("above");
  });

  it("places an ACT score against the composite range", () => {
    expect(fit(c, { act: 19 })).toBe("below");
    expect(fit(c, { act: 27 })).toBe("in");
    expect(fit(c, { act: 28 })).toBe("above");
  });

  it("with both scores, uses SAT when reported, else ACT", () => {
    expect(testFit(c, { sat: 1000, act: 30 })).toEqual({ fit: "below", test: "SAT", converted: false });
    expect(testFit({ ...c, sat_read_25: null }, { sat: 1000, act: 30 })).toEqual({ fit: "above", test: "ACT", converted: false });
  });

  it("converts with the concordance when the college reports only the other test", () => {
    // SAT 1100 is ACT 22, inside 20 to 27.
    expect(testFit({ ...c, sat_math_75: null }, { sat: 1100 })).toEqual({ fit: "in", test: "ACT", converted: true });
    // ACT 28 is SAT 1310, above 1010 to 1220.
    expect(testFit({ ...c, act_25: null, act_75: null }, { act: 28 })).toEqual({ fit: "above", test: "SAT", converted: true });
    expect(fitText({ fit: "above", test: "SAT", converted: true })).toBe("Your ACT (as an SAT) is above the middle 50%");
    expect(fitText({ fit: "in", test: "ACT", converted: false })).toBe("Your ACT is in the middle 50%");
  });

  it("says nothing without a score or any range", () => {
    expect(testFit(c, {})).toBeNull();
    expect(testFit({ ...c, sat_math_75: null, act_25: null }, { sat: 1100, act: 25 })).toBeNull();
    expect(testFit({ ...c, act_25: null, act_75: null }, { act: 5 })).toBeNull();
  });
});
