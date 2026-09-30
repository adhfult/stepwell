import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher } from "../fetch/polite.ts";
import { cleanText, isStudentJob, pageUrl, parsePosting, readUsajobs, unshout, usajobsUrl } from "./usajobs.ts";

// Four real postings from the first live search (2026-09-29), trimmed of long
// text and contact fields the adapter doesn't read: yearly pay, hourly pay
// with a $0.01 placeholder minimum, remote, and unpaid. Closed and broken
// postings are made from copies in the tests.
const SAMPLE = readFileSync(new URL("./fixtures/usajobs-search-live-sample.json", import.meta.url), "utf8");
const items = JSON.parse(SAMPLE).SearchResult.SearchResultItems as unknown[];
const TODAY = "2026-09-29";

type Raw = { MatchedObjectDescriptor: { ApplicationCloseDate: string } };
const withCloseDate = (date: string) => {
  const copy = structuredClone(items[0]) as Raw;
  copy.MatchedObjectDescriptor.ApplicationCloseDate = date;
  return copy;
};

describe("parsePosting", () => {
  it("reads a live posting", () => {
    const r = parsePosting(items[0], TODAY);
    expect(r?.status === "valid" && { ...r.value, summary: r.value.summary?.slice(0, 20) }).toEqual({
      id: "854458300",
      title: "Human Resources Specialist",
      organization: "United States Space Force",
      places: ["Patrick AFB, Florida"],
      states: ["FL"],
      remote: false,
      pay_min: 50835,
      pay_max: 97809,
      pay_interval: "year",
      who_may_apply: "Recent graduates, Students, Open to the public",
      closes_on: "2027-01-13",
      summary: "To qualify for a GS-",
      url: "https://www.usajobs.gov/job/854458300",
    });
  });

  it("treats a pay minimum under $1 as not given", () => {
    const r = parsePosting(items[1], TODAY);
    expect(r?.status === "valid" && r.value).toMatchObject({ pay_min: null, pay_max: 18, pay_interval: "hour", states: ["AK", "CT", "PR", "VA"] });
  });

  it("reads remote postings", () => {
    const r = parsePosting(items[2], TODAY);
    expect(r?.status === "valid" && r.value).toMatchObject({
      places: ["Anywhere in the U.S. (remote job)"],
      states: [],
      remote: true,
      pay_min: 21.36,
      pay_interval: "hour",
    });
  });

  it("leaves out unpaid and closed postings instead of rejecting them", () => {
    expect(parsePosting(items[3], TODAY)).toBeNull();
    expect(parsePosting(withCloseDate("2026-09-28T23:59:59.9970"), TODAY)).toBeNull();
  });

  it("rejects a posting without a real closing date", () => {
    expect(parsePosting(withCloseDate(""), TODAY)).toMatchObject({ status: "rejected", id: "854458300" });
    expect(parsePosting(withCloseDate("2026-11-31T00:00:00Z"), TODAY)).toMatchObject({
      status: "rejected",
      reason: expect.stringContaining("not a real date"),
    });
    expect(parsePosting(withCloseDate("2026-11-9"), TODAY)).toMatchObject({ status: "rejected" });
  });
});

describe("helpers", () => {
  it("turns all-caps titles into title case, keeping acronyms", () => {
    expect(unshout("COMPUTER ENGINEER")).toBe("Computer Engineer");
    expect(unshout("IT SPECIALIST (INFOSEC/NETWORK)")).toBe("IT Specialist (Infosec/Network)");
    expect(unshout("STUDENT TRAINEE (OFFICE OF THE CHIEF)")).toBe("Student Trainee (Office of the Chief)");
    expect(unshout("Student Trainee (Park Guide)")).toBe("Student Trainee (Park Guide)");
    expect(unshout("GS-7 IT INTERN")).toBe("GS-7 IT Intern");
  });


  it("keeps student jobs and drops jobs that merely accept students (live examples)", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `path${i}`);
    expect(isStudentJob("Contract Specialist", ["student", "graduates"], [])).toBe(true);
    expect(isStudentJob("Student Trainee (Park Ranger)", twelve, [])).toBe(true);
    expect(isStudentJob("FOREIGN AFFAIRS SPECIALIST", ["student", "a", "b", "c"], ["Internship"])).toBe(true);
    expect(isStudentJob("Honors Program Law Clerk (J.D. Students)", ["student", "graduates"], [])).toBe(true);
    expect(isStudentJob("Program Assistant", twelve, [])).toBe(false);
    expect(isStudentJob("Physician (Anesthesiology)", twelve.slice(0, 8), [])).toBe(false);
  });


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
      "854458300 valid",
      "880718800 valid",
      "869474800 valid",
    ]);
  });

  it("refuses to start without the key and email", async () => {
    await expect(readUsajobs({} as Fetcher, { etag: null, release: null }, {})).rejects.toThrow("USAJOBS_API_KEY");
  });
});
