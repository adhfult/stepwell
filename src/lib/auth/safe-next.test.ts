import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps paths on this site, with their query and fragment", () => {
    expect(safeNextPath("/account/profile")).toBe("/account/profile");
    expect(safeNextPath("/careers?q=nurse#top")).toBe("/careers?q=nurse#top");
  });

  it.each([
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["absolute URL", "https://evil.example/account"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path", "account"],
    ["control character", "/account\n//evil.example"],
    ["empty", ""],
    ["dot segment", "/.//evil.example"],
    ["dot-dot segment", "/..//evil.example"],
    ["folder then dot-dot", "/a/..//evil.example"],
    ["encoded dot", "/%2e//evil.example"],
    ["encoded dot-dot", "/%2e%2e//evil.example/x"],
  ])("falls back for a %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("falls back for missing or non-text values, using the given fallback", () => {
    expect(safeNextPath(null, "/account")).toBe("/account");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/account"])).toBe("/");
  });

  it("falls back for very long values", () => {
    expect(safeNextPath("/" + "a".repeat(600))).toBe("/");
  });
});
