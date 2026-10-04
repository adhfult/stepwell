import { describe, expect, it } from "vitest";
import { CAPS, toPercent } from "./scale";

describe("toPercent", () => {
  it("places a value on its scale", () => {
    expect(toPercent(50_000, CAPS.pay)).toBe(25);
    expect(toPercent(0.64, CAPS.rate)).toBe(64);
  });

  it("fills the bar above the cap and empties it below zero", () => {
    expect(toPercent(239_200, CAPS.pay)).toBe(100);
    expect(toPercent(-5, CAPS.debt)).toBe(0);
  });
});
