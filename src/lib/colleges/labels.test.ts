import { describe, expect, it } from "vitest";
import { debtText, domainOf, earningsText, filtersSchema, netPriceText, ownershipName, rateText } from "./labels";

describe("college labels", () => {
  it("prefers 4-year earnings and says which figure it is", () => {
    expect(earningsText(52000, 40000)).toBe("Graduates earn $52,000 a year");
    expect(earningsText(null, 40000)).toBe("Graduates earn $40,000 a year (1 year after finishing)");
    expect(earningsText(null, null)).toBeNull();
  });

  it("formats money and rates, and says nothing when missing", () => {
    expect(debtText(24000)).toBe("Median federal loan debt $24,000");
    expect(netPriceText(0)).toBe("Net price $0 a year");
    expect(netPriceText(null)).toBeNull();
    expect(rateText("Graduation rate", "0.6135")).toBe("Graduation rate 61%");
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
