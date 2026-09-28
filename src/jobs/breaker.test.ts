import { describe, expect, it } from "vitest";
import { breakerReason } from "./breaker.ts";
import { parseJobEnv } from "./env.ts";

describe("breakerReason", () => {
  it("lets a normal run through", () => {
    expect(breakerReason({ valid: 1000, rejected: 16, lastValid: 1016 })).toBeNull();
  });

  it("skips the 50% rule on the first run", () => {
    expect(breakerReason({ valid: 10, rejected: 0, lastValid: null })).toBeNull();
  });

  it("stops on no valid records", () => {
    expect(breakerReason({ valid: 0, rejected: 0, lastValid: null })).toBe("No valid records");
  });

  it("stops when over 20% are rejected", () => {
    expect(breakerReason({ valid: 79, rejected: 21, lastValid: null })).toMatch("over 20%");
    expect(breakerReason({ valid: 80, rejected: 20, lastValid: null })).toBeNull();
  });

  it("stops when valid records drop under half of the last success", () => {
    expect(breakerReason({ valid: 499, rejected: 0, lastValid: 1000 })).toMatch("under half");
    expect(breakerReason({ valid: 500, rejected: 0, lastValid: 1000 })).toBeNull();
  });
});

describe("parseJobEnv", () => {
  it("defaults to the local database", () => {
    expect(parseJobEnv({}).IMPORT_DATABASE_URL).toBe(
      "postgresql://importer:importer@127.0.0.1:54322/postgres",
    );
  });

  it("requires a contact address in CI", () => {
    expect(() => parseJobEnv({ CI: "true" })).toThrow("IMPORT_CONTACT");
    expect(parseJobEnv({ CI: "true", IMPORT_CONTACT: "data@example.org" }).IMPORT_CONTACT).toBe(
      "data@example.org",
    );
  });

  it("rejects a URL that isn't Postgres", () => {
    expect(() => parseJobEnv({ IMPORT_DATABASE_URL: "https://example.org" })).toThrow(
      "IMPORT_DATABASE_URL",
    );
  });
});
