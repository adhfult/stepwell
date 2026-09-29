import { describe, expect, it } from "vitest";
import { updatedText } from "./labels";

describe("updatedText", () => {
  it("dates in Eastern time", () => {
    expect(updatedText("2026-09-29T01:33:58Z")).toBe("Last updated September 28, 2026");
  });
  it("says when a source never loaded", () => {
    expect(updatedText(null)).toBe("Not loaded yet");
    expect(updatedText(undefined)).toBe("Not loaded yet");
  });
});
