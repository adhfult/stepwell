import { describe, expect, it } from "vitest";
import { RobotsDisallowedError } from "./fetch/polite.ts";
import { linkProblem, pageTitle } from "./award-sites-check.ts";

describe("linkProblem", () => {
  const ok = { status: 200, body: "", contentType: "text/html", finalUrl: "https://x.org/s", etag: null };
  it("passes a page that answers 200, even after a redirect", () => expect(linkProblem(ok)).toBeNull());
  it("flags any other status", () => expect(linkProblem({ ...ok, status: 404 })).toBe("answered 404"));
  it("says when robots.txt kept it from checking", () =>
    expect(linkProblem(new RobotsDisallowedError("no"))).toBe("not checked (robots.txt)"));
  it("reports a network failure", () => expect(linkProblem(new Error("ETIMEDOUT"))).toBe("failed: ETIMEDOUT"));
});

describe("pageTitle", () => {
  it("reads the title, tidying whitespace", () =>
    expect(pageTitle("<html><head><title lang=en>\n  Scholarships |\n Foundation </title>")).toBe("Scholarships | Foundation"));
  it("is null without one", () => expect(pageTitle("<p>no title</p>")).toBeNull());
});
