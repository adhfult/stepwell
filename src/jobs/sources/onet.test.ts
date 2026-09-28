import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher, FetchResult } from "../fetch/polite.ts";
import { findLatestRelease, parseOccupations, readOnet } from "./onet.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const page = fixture("onet-database-page.html");
const csv = fixture("onet-occupation_data.csv");

describe("findLatestRelease", () => {
  it("reads the release and CSV link from the saved O*NET page", () => {
    expect(findLatestRelease(page)).toEqual({
      release: "31.0",
      csvUrl: "https://www.onetcenter.org/dl_files/database/db_31_0_csv/occupation_data.csv",
    });
  });

  it("picks the newest release when several are linked", () => {
    const html = page + page.replaceAll("db_31_0", "db_31_1") + page.replaceAll("db_31_0", "db_30_2");
    expect(findLatestRelease(html).release).toBe("31.1");
  });

  it("fails loudly when the page layout changes", () => {
    expect(() => findLatestRelease("<html></html>")).toThrow("No occupation_data.csv link");
  });
});

describe("parseOccupations", () => {
  it("turns every row of the saved file into a valid occupation", () => {
    const records = parseOccupations(csv);
    expect(records).toHaveLength(20);
    expect(records.every((r) => r.status === "valid")).toBe(true);
    expect(records[0]).toMatchObject({
      id: "11-1011.00",
      value: { onet_code: "11-1011.00", title: "Chief Executives" },
    });
  });

  it("rejects bad codes, empty titles and duplicates with a reason", () => {
    const header = csv.split("\r\n")[0];
    const rows = [
      header,
      '11-1011.00,Chief Executives,"Lead."',
      '11-1011.00,Chief Executives again,"Lead."',
      "not-a-code,Something,Text",
      '11-2011.00,,"No title"',
    ].join("\r\n");
    const records = parseOccupations(rows);
    expect(records.map((r) => r.status)).toEqual(["valid", "rejected", "rejected", "rejected"]);
    expect(records[1]).toMatchObject({ id: "row 3", reason: "Duplicate 11-1011.00" });
    expect(records[2]).toMatchObject({ reason: expect.stringContaining("onet_code") });
    expect(records[3]).toMatchObject({ reason: expect.stringContaining("title") });
  });

  it("rejects every row when the columns are renamed", () => {
    const renamed = csv.replace("O*NET-SOC Code", "Code");
    expect(parseOccupations(renamed).every((r) => r.status === "rejected")).toBe(true);
  });
});

describe("readOnet", () => {
  function fakeFetcher(csvResponse: Partial<FetchResult>) {
    const calls: Array<{ url: string; etag?: string | null }> = [];
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url, options) {
        calls.push({ url, etag: options?.etag });
        const base = { contentType: null, finalUrl: url, etag: null };
        if (url.endsWith("database.html")) return { ...base, status: 200, body: page };
        return { ...base, status: 200, body: csv, ...csvResponse };
      },
    };
    return { fetcher, calls };
  }

  it("reports unchanged for the same release without downloading the file", async () => {
    const { fetcher, calls } = fakeFetcher({});
    const result = await readOnet(fetcher, { etag: '"abc"', release: "31.0" });
    expect(calls).toHaveLength(1);
    expect(result).toEqual({ status: "unchanged", release: "31.0", etag: '"abc"' });
  });

  it("downloads and parses a new release", async () => {
    const { fetcher, calls } = fakeFetcher({ etag: '"new"' });
    const result = await readOnet(fetcher, { etag: '"abc"', release: "30.2" });
    expect(calls[1].url).toMatch(/occupation_data\.csv$/);
    expect(result).toMatchObject({ status: "fetched", release: "31.0", etag: '"new"' });
    if (result.status === "fetched") expect(result.records).toHaveLength(20);
  });

  it("fails on an unexpected status", async () => {
    const { fetcher } = fakeFetcher({ status: 404 });
    await expect(readOnet(fetcher, { etag: null, release: null })).rejects.toThrow("returned 404");
  });
});
