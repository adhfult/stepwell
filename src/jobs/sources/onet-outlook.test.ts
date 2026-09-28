import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher, FetchResult } from "../fetch/polite.ts";
import { parseOutlook, readOnetOutlook } from "./onet-outlook.ts";

// Shaped like the examples in O*NET's API v2 reference (job outlook and
// "See all careers"); the live import on 2026-09-28 parsed all 923 careers
// with this code. The 27-2011.00 file is a made-up hourly-only case using
// the documented hourly and "_over" fields (real Actors pay is published hourly
// only, like this, but without an "_over" figure).
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const hvac = JSON.parse(fixture("onet-outlook-49-9021.01.json"));
const actors = JSON.parse(fixture("onet-outlook-27-2011.00.json"));

describe("parseOutlook", () => {
  it("reads outlook, reasons and annual pay", () => {
    expect(parseOutlook("49-9021.01", hvac)).toEqual({
      onet_code: "49-9021.01",
      outlook: "bright",
      bright_reasons: ["grow"],
      wage_soc_code: "49-9021",
      annual_low: 40050,
      annual_median: 61010,
      annual_high: 95210,
      hourly_low: null,
      hourly_median: null,
      hourly_high: null,
      or_more: [],
    });
  });

  it("reads hourly-only pay and marks figures above the BLS maximum", () => {
    expect(parseOutlook("27-2011.00", actors)).toMatchObject({
      outlook: "below_average",
      bright_reasons: [],
      annual_median: null,
      hourly_low: 13.02,
      hourly_median: 23.94,
      hourly_high: 115,
      or_more: ["hourly_high"],
    });
  });

  it("drops Bright Outlook reasons it doesn't know", () => {
    const body = { ...hvac, bright_outlook: [{ code: "grow" }, { code: "sparkly" }] };
    expect(parseOutlook("49-9021.01", body).bright_reasons).toEqual(["grow"]);
  });

  it("rejects an unknown outlook category", () => {
    expect(() => parseOutlook("49-9021.01", { outlook: { category: "Great" } })).toThrow();
  });
});

describe("readOnetOutlook", () => {
  function fakeFetcher(outlookStatus: Record<string, number> = {}) {
    const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
    const respond = (url: string, status: number, body: unknown): FetchResult => ({
      status,
      body: body === null ? "" : JSON.stringify(body),
      contentType: "application/json",
      finalUrl: url,
      etag: null,
    });
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url, options) {
        calls.push({ url, headers: options?.headers });
        if (url.includes("/mnm/careers/?start=1")) return respond(url, 200, JSON.parse(fixture("onet-outlook-list-page1.json")));
        if (url.includes("/mnm/careers/?start=3")) return respond(url, 200, JSON.parse(fixture("onet-outlook-list-page2.json")));
        const code = url.match(/careers\/([^/]+)\/job_outlook/)![1];
        const status = outlookStatus[code] ?? 200;
        if (status !== 200) return respond(url, status, { error: "no data" });
        return respond(url, 200, code === "27-2011.00" ? actors : hvac);
      },
    };
    return { fetcher, calls };
  }

  it("follows the career list's pages, sends the key, and reads each outlook", async () => {
    const { fetcher, calls } = fakeFetcher();
    const result = await readOnetOutlook(fetcher, { etag: null, release: null }, { ONET_API_KEY: "test-key-123" });
    expect(calls).toHaveLength(2 + 3);
    expect(calls.every((c) => c.headers?.["X-API-Key"] === "test-key-123")).toBe(true);
    expect(result).toMatchObject({ status: "fetched", release: null });
    if (result.status === "fetched") {
      expect(result.records.map((r) => r.id)).toEqual(["13-2011.00", "27-2011.00", "49-9021.01"]);
      expect(result.records.every((r) => r.status === "valid")).toBe(true);
    }
  });

  it("skips careers O*NET has no outlook for (422)", async () => {
    const { fetcher } = fakeFetcher({ "13-2011.00": 422 });
    const result = await readOnetOutlook(fetcher, { etag: null, release: null }, { ONET_API_KEY: "test-key-123" });
    if (result.status === "fetched") expect(result.records.map((r) => r.id)).toEqual(["27-2011.00", "49-9021.01"]);
  });

  it("fails on other errors", async () => {
    const { fetcher } = fakeFetcher({ "13-2011.00": 401 });
    await expect(
      readOnetOutlook(fetcher, { etag: null, release: null }, { ONET_API_KEY: "test-key-123" }),
    ).rejects.toThrow("returned 401");
  });

  it("fails clearly without a key", async () => {
    const { fetcher } = fakeFetcher();
    await expect(readOnetOutlook(fetcher, { etag: null, release: null }, {})).rejects.toThrow("ONET_API_KEY is not set");
  });
});
