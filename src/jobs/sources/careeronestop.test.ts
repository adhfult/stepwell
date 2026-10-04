import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Fetcher } from "../fetch/polite.ts";
import { httpsUrl, parseCertifications, parseLicenses, parseYouthPrograms, readCosLicenses } from "./careeronestop.ts";

// Real responses (2026-10-04), trimmed, with contact details removed.
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("CareerOneStop parsers", () => {
  it("keeps youth service providers only, with https links", () => {
    const records = parseYouthPrograms(fixture("cos-youth-programs.json"));
    expect(records.map((r) => r.status === "valid" && r.value.name)).toEqual([
      "Anchorage School District",
      "Goodwill Industries Alaska - Job Connections",
      "National Guard Youth Foundation - Anchorage",
      "Chico One-Stop",
    ]);
    expect(records.every((r) => r.status === "valid" && (r.value.website === null || r.value.website.startsWith("https://")))).toBe(true);
  });

  it("reads licenses with state codes and readable agency names", () => {
    const [first, dc] = parseLicenses("29-1141.00", fixture("cos-licenses-29-1141.00.json"));
    expect(first).toMatchObject({
      status: "valid",
      value: { onet_code: "29-1141.00", title: "Registered Nurse (RN)", state: "KS", agency: "Kansas State Board of Nursing, Licensure", agency_url: null },
    });
    expect(dc).toMatchObject({ status: "valid", value: { state: "DC", agency_url: "https://dchealth.dc.gov/service/professional-license-applications" } });
  });

  it("accepts license IDs with & and parentheses, and leaves out federal ones", () => {
    const raw = { LicenseList: [
      { ID: "08-KEYL(G)L", Title: "Key License", State: "Colorado" },
      { ID: "34-11-2031.00", Title: "Office Manager", State: "New Jersey" },
      { ID: "00-FinOpL", Title: "Financial Operations", State: "Federal Agencies" },
    ] };
    expect(parseLicenses("11-1011.00", raw)).toMatchObject([
      { status: "valid", value: { license_id: "08-KEYL(G)L", state: "CO" } },
      { status: "valid", value: { license_id: "34-11-2031.00", state: "NJ" } },
    ]);
  });

  it("reads core certifications", () => {
    const [first] = parseCertifications("29-1141.00", fixture("cos-certifications-29-1141.00.json"));
    expect(first).toMatchObject({ status: "valid", value: { name: "Certified Correctional Health Professional", url: "https://ncchc.org/professional-certification/cchp/" } });
  });

  it("links only to https pages", () => {
    expect(httpsUrl("http://www.ksbn.org")).toBeNull();
    expect(httpsUrl("javascript:alert(1)")).toBeNull();
    expect(httpsUrl(" https://example.gov/x ")).toBe("https://example.gov/x");
  });

  it("pages through licenses with the token in a header, never the URL", async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    // The first page holds a federal entry the parser drops; paging must still continue.
    const page = (n: number) => ({
      RecordCount: 51,
      LicenseList: Array.from({ length: n }, (_, i) => ({ ID: `X-${i}`, Title: "RN", State: i === 0 && n === 50 ? "Federal Agencies" : "Ohio" })),
    });
    const fetcher: Fetcher = {
      requestCount: () => calls.length,
      async get(url, options) {
        calls.push({ url, auth: options?.headers?.Authorization });
        return { status: 200, body: JSON.stringify(page(calls.length === 1 ? 50 : 1)), contentType: "application/json", finalUrl: url, etag: null };
      },
    };
    const env = { CAREERONESTOP_USER_ID: "user-1", CAREERONESTOP_API_TOKEN: "t".repeat(20) };
    const result = await readCosLicenses(fetcher, { etag: null, release: null }, env, ["29-1141.00"]);
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.careeronestop.org/v1/license/user-1/29-1141.00/0/0/0/0/50",
      "https://api.careeronestop.org/v1/license/user-1/29-1141.00/0/0/0/50/50",
    ]);
    expect(calls.every((c) => c.auth === `Bearer ${"t".repeat(20)}` && !c.url.includes("t".repeat(20)))).toBe(true);
    expect(result.status === "fetched" && result.records.length).toBe(50);
  });
});
