import { describe, expect, it } from "vitest";
import { payText, placesText } from "./labels";

describe("payText", () => {
  it("writes pay the way a student reads it", () => {
    expect(payText({ pay_min: 18.5, pay_max: 24, pay_interval: "hour" })).toBe("$18.50 to $24.00 an hour");
    expect(payText({ pay_min: 41966, pay_max: 54557, pay_interval: "year" })).toBe("$41,966 to $54,557 a year");
    expect(payText({ pay_min: 20, pay_max: 20, pay_interval: "hour" })).toBe("$20.00 an hour");
    expect(payText({ pay_min: 3000, pay_max: null, pay_interval: "month" })).toBe("From $3,000 a month");
    expect(payText({ pay_min: null, pay_max: 1500, pay_interval: null })).toBe("Up to $1,500");
    expect(payText({ pay_min: null, pay_max: null, pay_interval: "hour" })).toBe("Pay is on the posting");
  });
});

describe("placesText", () => {
  it("names the first place and counts the rest", () => {
    expect(placesText(["Denver, Colorado"], false)).toBe("Denver, Colorado");
    expect(placesText(["Denver, Colorado", "Boise, Idaho"], false)).toBe("Denver, Colorado and 1 more place");
    expect(placesText([], true)).toBe("Remote");
  });
});
