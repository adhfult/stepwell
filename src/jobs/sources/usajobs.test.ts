import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher } from "../fetch/polite.ts";
import { cleanText, pageUrl, parsePosting, readUsajobs, usajobsUrl } from "./usajobs.ts";

// Built from the example response in USAJOBS's API reference (no key yet for
// a live page): the docs' own posting, plus the variations live data may
// bring (numbers, pay interval in words, remote, unpaid, closed, broken).
// Replace with a saved live page after the first real dry run.
const SAMPLE = readFileSync(new URL("./fixtures/usajobs-search-docs-sample.json", import.meta.url), "utf8");
const items = JSON.parse(SAMPLE).SearchResult.SearchResultItems as unknown[];
const TODAY = "2026-09-29";

describe("parsePosting", () => {
  it("reads the docs' example posting", () => {
    expect(parsePosting(items[0], TODAY)).toEqual({
      status: "valid",
      id: "21947200",
      value: {
        id: "21947200",
        title: "IT SPECIALIST (INFOSEC/NETWORK)",
        organization: "Space and Naval Warfare Systems Command",
        places: ["Point Loma Complex, San Diego, California"],
        states: ["CA"],
        remote: false,
        pay_min: 92108,
        pay_max: 119746,
        pay_interval: "year",
        who_may_apply: "United States Citizens",
        closes_on: "2026-12-01",
        summary: "You must be enrolled at least half-time in a qualifying program - see Education.",
        url: "https://www.usajobs.gov/GetJob/ViewDetails/21947200",
      },
    });
  });

  it("accepts numbers, pay intervals in words and remote postings", () => {
    const r = parsePosting(items[1], TODAY);
    expect(r?.status === "valid" && r.value).toMatchObject({
      id: "812345601",
      states: [],
      remote: true,
      pay_min: 18.5,
      pay_max: 24,
      pay_interval: "hour",
      who_may_apply: "Students",
      closes_on: "2026-10-15",
    });
  });

  it("leaves out unpaid and closed postings instead of rejecting them", () => {
    expect(parsePosting(items[2], TODAY)).toBeNull();
    expect(parsePosting(items[3], TODAY)).toBeNull();
  });

  it("rejects a posting without a real closing date", () => {
    expect(parsePosting(items[4], TODAY)).toMatchObject({ status: "rejected", id: "812345604" });
    const impossible = structuredClone(items[0]) as { MatchedObjectDescriptor: { ApplicationCloseDate: string } };
    impossible.MatchedObjectDescriptor.ApplicationCloseDate = "2026-11-31T00:00:00Z";
    expect(parsePosting(impossible, TODAY)).toMatchObject({ status: "rejected", reason: expect.stringContaining("not a real date") });
    impossible.MatchedObjectDescriptor.ApplicationCloseDate = "2026-11-9";
    expect(parsePosting(impossible, TODAY)).toMatchObject({ status: "rejected" });
  });
});

describe("helpers", () => {
  it("keeps links on usajobs.gov only", () => {
    expect(usajobsUrl("https://www.usajobs.gov:443/job/1")).toBe("https://www.usajobs.gov/job/1");
    expect(usajobsUrl("https://usajobs.gov.evil.example/job/1")).toBeNull();
    expect(usajobsUrl("http://www.usajobs.gov/job/1")).toBeNull();
  });

  it("cleans text and cuts it at a word", () => {
    expect(cleanText("  a\u0007 <b>b</b>\n c ", 50)).toBe("a b c");
    expect(cleanText("one two three four", 12)).toBe("one two…");
    expect(cleanText("  ", 10)).toBeNull();
  });
});

describe("readUsajobs", () => {
  it("sends the key and email in headers, pages through, and skips what it leaves out", async () => {
    const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url, options) {
        calls.push({ url, headers: options?.headers });
        return { status: 200, body: SAMPLE, contentType: "application/json", finalUrl: url, etag: null };
      },
    };
    const result = await readUsajobs(fetcher, { etag: null, release: null }, { USAJOBS_API_KEY: "k".repeat(20), USAJOBS_EMAIL: "me@example.org" }, TODAY);

    expect(calls).toEqual([
      { url: pageUrl(1), headers: { "User-Agent": "me@example.org", "Authorization-Key": "k".repeat(20), Accept: "application/json" } },
    ]);
    expect(calls[0].url).not.toContain("k".repeat(20));
    expect(result.status === "fetched" && result.records.map((r) => `${r.id} ${r.status}`)).toEqual([
      "21947200 valid",
      "812345601 valid",
      "812345604 rejected",
    ]);
  });

  it("refuses to start without the key and email", async () => {
    await expect(readUsajobs({} as Fetcher, { etag: null, release: null }, {})).rejects.toThrow("USAJOBS_API_KEY");
  });
});
