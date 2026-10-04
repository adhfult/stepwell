import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher } from "../fetch/polite.ts";
import { normalizeWebsite, pageUrl, parseSchool, readScorecard } from "./scorecard.ts";

// A real page from the Scorecard API (2026-09-28, public DEMO_KEY), cut to 3
// schools and a few programs each.
const page = JSON.parse(readFileSync(new URL("./fixtures/scorecard-page.json", import.meta.url), "utf8"));

describe("parseSchool", () => {
  it("reads a public college with its consumer-site figures", () => {
    const record = parseSchool(page.results[0]);
    expect(record).toMatchObject({
      status: "valid",
      id: "100654",
      value: {
        unitid: 100654,
        name: "Alabama A & M University",
        state: "AL",
        ownership: "public",
        website: "https://www.aamu.edu",
        net_price: 17621,
        graduation_rate: 0.3053,
      },
    });
  });

  it("keeps programs with graduates or earnings, as 4-digit CIP with a dot", () => {
    const record = parseSchool(page.results[0]);
    if (record.status !== "valid") throw new Error("expected valid");
    expect(record.value.programs.length).toBeGreaterThan(0);
    expect(record.value.programs.every((p) => /^\d{2}\.\d{2}$/.test(p.cip4))).toBe(true);
    expect(record.value.programs.every((p) => p.graduates || p.earnings_4yr || p.earnings_1yr)).toBe(true);
    expect(record.value.programs.every((p) => !p.title.endsWith("."))).toBe(true);
  });

  it("uses the private net price for a private college, and leaves a missing one empty", () => {
    const record = parseSchool(page.results[2]);
    expect(record).toMatchObject({ status: "valid", value: { ownership: "private_nonprofit", net_price: null } });
  });

  it("reads test scores, test policy, income prices, setting and minority-serving flags", () => {
    expect(parseSchool(page.results[0])).toMatchObject({
      value: {
        sat_read_25: 420,
        sat_math_25: 390,
        act_25: 14,
        act_75: 19,
        test_policy: "considered",
        net_price_by_income: [16500, 16387, 19622, 21680, 20364],
        locale: "city",
        two_year: false,
        serves: ["hbcu"],
      },
    });
  });

  it("leaves unreported directory fields empty", () => {
    expect(parseSchool(page.results[2])).toMatchObject({
      value: { sat_read_25: null, act_75: null, test_policy: null, net_price_by_income: null, serves: [] },
    });
  });

  it("drops a bad directory value, not the college", () => {
    const bad = {
      ...page.results[0],
      "latest.admissions.sat_scores.25th_percentile.math": 9999,
      "latest.admissions.test_requirements": 4,
      "school.locale": "city",
    };
    expect(parseSchool(bad)).toMatchObject({
      status: "valid",
      value: { sat_math_25: null, sat_read_25: 420, test_policy: null, locale: null },
    });
  });

  it("rejects a school without a name", () => {
    expect(parseSchool({ ...page.results[0], "school.name": "" })).toMatchObject({ status: "rejected", id: "100654" });
  });
});

describe("normalizeWebsite", () => {
  it("adds https and drops a trailing slash", () => {
    expect(normalizeWebsite("www.aamu.edu/")).toBe("https://www.aamu.edu");
    expect(normalizeWebsite("http://example.edu/admissions/")).toBe("https://example.edu/admissions");
    expect(normalizeWebsite("not a url")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});

describe("readScorecard", () => {
  it("pages through every school with the key in a header, never the URL", async () => {
    const calls: Array<{ url: string; key?: string }> = [];
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url, options) {
        calls.push({ url, key: options?.headers?.["X-Api-Key"] });
        const pageNumber = Number(new URL(url).searchParams.get("page"));
        const body = { metadata: { page: pageNumber, total: 150, per_page: 100 }, results: page.results.slice(pageNumber, pageNumber + 1) };
        return { status: 200, body: JSON.stringify(body), contentType: "application/json", finalUrl: url, etag: null };
      },
    };
    const result = await readScorecard(fetcher, { etag: null, release: null }, { SCORECARD_API_KEY: "test-key-123" });
    expect(calls.map((c) => new URL(c.url).searchParams.get("page"))).toEqual(["0", "1"]);
    expect(calls.every((c) => c.key === "test-key-123" && !c.url.includes("test-key-123"))).toBe(true);
    expect(result.status === "fetched" && result.records).toHaveLength(2);
  });

  it("asks only for operating certificate and degree schools", () => {
    const url = new URL(pageUrl(3));
    expect(url.searchParams.get("school.operating")).toBe("1");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("api_key")).toBeNull();
  });
});
