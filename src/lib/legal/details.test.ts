import { describe, expect, it } from "vitest";
import { placeholdersLeft } from "./details";

describe("placeholdersLeft", () => {
  it("names the details still in [BRACKETS]", () => {
    expect(placeholdersLeft({ contactEmail: "[CONTACT EMAIL]", lawState: "Oregon" })).toEqual(["contactEmail"]);
    expect(placeholdersLeft({ contactEmail: "hello@example.org" })).toEqual([]);
  });
});
