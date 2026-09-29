import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher, FetchResult } from "../fetch/polite.ts";
import {
  buildDetails,
  DETAIL_FILES,
  type DetailFile,
  findLatestRelease,
  parseOccupations,
  readOnet,
} from "./onet.ts";

// Real excerpts of O*NET 31.0 files, saved 2026-09-28. The detail files keep
// only 11-1011.00, 11-1011.03 and 11-1021.00.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const page = fixture("onet-database-page.html");
const csv = fixture("onet-occupation_data.csv");
const detailFiles = Object.fromEntries(
  (Object.keys(DETAIL_FILES) as DetailFile[]).map((name) => [name, fixture(`onet-${name}.csv`)]),
) as Record<DetailFile, string>;
const noMinimums = Object.fromEntries(Object.keys(DETAIL_FILES).map((name) => [name, 0])) as Record<DetailFile, number>;

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

describe("buildDetails", () => {
  const details = buildDetails(detailFiles, noMinimums);
  const ceo = details.get("11-1011.00")!;

  it("reads the job zone and the most common education level", () => {
    expect(ceo.job_zone).toBe(5);
    expect(ceo).toMatchObject({ education_level: 8, education_share: 46 });
  });

  it("picks the most common level even when O*NET flags its share, and then hides the share", () => {
    // Registered Nurses in O*NET 31.0: bachelor's 55.92% is flagged "Recommend Suppress".
    const header = detailFiles.education.split("\r\n")[0];
    const row = (category: number, value: string, suppress: string) =>
      `29-1141.00,Registered Nurses,2.D.1,Required Level of Education,RL,Required Level Of Education (Categories 1-12),${category},${value},28,1,,,${suppress},08/2023,Incumbent`;
    const education = [header, row(3, "22.50", "N"), row(5, "19.39", "N"), row(6, "55.92", "Y")].join("\r\n");
    const nurses = buildDetails({ ...detailFiles, education }, noMinimums).get("29-1141.00")!;
    expect(nurses).toMatchObject({ education_level: 6, education_share: null });
  });

  it("reads the six interest scores (OI scale), ignoring the high-point rows", () => {
    expect(ceo).toMatchObject({
      interest_realistic: 1.26,
      interest_investigative: 3.05,
      interest_artistic: 2.16,
      interest_social: 3.54,
      interest_enterprising: 6.96,
      interest_conventional: 4.97,
    });
  });

  it("reads knowledge importance for every area (IM scale)", () => {
    expect(ceo.knowledge).toHaveLength(33);
    expect(ceo.knowledge).toContainEqual({ area_id: "2.C.1.a", importance: 4.78 });
  });

  it("keeps the 8 most important core tasks, most important first", () => {
    expect(ceo.tasks).toHaveLength(8);
    expect(ceo.tasks[0]).toBe(
      "Direct or coordinate an organization's financial or budget activities to fund operations, maximize investments, or increase efficiency.",
    );
  });

  it("keeps the 6 most important skills from both skill files", () => {
    expect(ceo.skills).toHaveLength(6);
    expect(ceo.skills[0]).toBe("Judgment and Decision Making");
  });

  it("collects reported titles (with O*NET's featured flag) and alternate titles", () => {
    expect(ceo.titles).toContainEqual({ kind: "reported", title: "CEO (Chief Executive Officer)", featured: true });
    expect(ceo.titles).toContainEqual({ kind: "reported", title: "Chief Diversity Officer (CDO)", featured: false });
    expect(ceo.titles.filter((t) => t.kind === "alternate")).toHaveLength(75);
  });

  it("reads related careers with their tier and rank", () => {
    expect(ceo.related[0]).toEqual({ code: "11-1021.00", tier: "primary_short", rank: 1 });
  });

  it("fails when a file has fewer usable rows than expected", () => {
    expect(() => buildDetails(detailFiles)).toThrow(/only \d+ usable rows/);
  });

  it("fails when a column is renamed", () => {
    const renamed = { ...detailFiles, job_titles: detailFiles.job_titles.replace("Job Title", "Title Of Job") };
    expect(() => buildDetails(renamed, { ...noMinimums, job_titles: 1 })).toThrow("job_titles.csv: only 0 usable rows");
  });
});

describe("parseOccupations", () => {
  it("turns every row of the saved file into a valid occupation, with details where there are some", () => {
    const records = parseOccupations(csv, buildDetails(detailFiles, noMinimums));
    expect(records).toHaveLength(20);
    expect(records.every((r) => r.status === "valid")).toBe(true);
    expect(records[0]).toMatchObject({
      id: "11-1011.00",
      value: { onet_code: "11-1011.00", title: "Chief Executives", job_zone: 5 },
    });
    // A career with no detail rows still imports, with empty details.
    const last = records.at(-1);
    expect(last).toMatchObject({ status: "valid", value: { job_zone: null, tasks: [], titles: [] } });
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
  function fakeFetcher(status = 200) {
    const calls: string[] = [];
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url) {
        calls.push(url);
        const base: Omit<FetchResult, "body"> = { status: 200, contentType: null, finalUrl: url, etag: null };
        if (url.endsWith("database.html")) return { ...base, body: page };
        if (url.endsWith("occupation_data.csv")) return { ...base, status, body: csv, etag: '"new"' };
        const name = url.split("/").at(-1)!.replace(".csv", "");
        return { ...base, body: detailFiles[name as DetailFile] };
      },
    };
    return { fetcher, calls };
  }

  it("reports unchanged for the same release without downloading anything else", async () => {
    const { fetcher, calls } = fakeFetcher();
    const result = await readOnet(fetcher, { etag: '"abc"', release: "31.0" });
    expect(calls).toHaveLength(1);
    expect(result).toEqual({ status: "unchanged", release: "31.0", etag: '"abc"' });
  });

  it("downloads a new release's files from the same folder and joins them", async () => {
    const { fetcher, calls } = fakeFetcher();
    const result = await readOnet(fetcher, { etag: null, release: "30.2" }, noMinimums);
    expect(calls).toHaveLength(2 + Object.keys(DETAIL_FILES).length);
    expect(calls.every((u) => u.includes("/db_31_0_csv/") || u.endsWith("database.html"))).toBe(true);
    expect(result).toMatchObject({ status: "fetched", release: "31.0", etag: '"new"' });
    if (result.status === "fetched") {
      expect(result.records[0]).toMatchObject({ value: { skills: expect.arrayContaining(["Critical Thinking"]) } });
    }
  });

  it("fails on an unexpected status", async () => {
    const { fetcher } = fakeFetcher(404);
    await expect(readOnet(fetcher, { etag: null, release: null }, noMinimums)).rejects.toThrow("returned 404");
  });
});
