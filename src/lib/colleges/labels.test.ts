import { describe, expect, it } from "vitest";
import {
  collegeMeters,
  debtText,
  domainOf,
  earningsText,
  filtersSchema,
  ownershipName,
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
