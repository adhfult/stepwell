import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile, readOfficialList } from "./official-list.ts";

const entry = {
  id: "ca-cal-grant-a",
  title: "Cal Grant A",
  sponsor: "California Student Aid Commission",
  sponsor_type: "state",
  url: "https://www.csac.ca.gov/cal-grants",
  award: { min: null, max: 14226, text: "Up to $14,226 a year toward tuition" },
  deadline: { kind: "usually", month_day: "03-02" },
  stages: ["high_school", "college"],
  rules: {
    state: "CA",
    min_gpa: 3.0,
    fields: [],
    citizenship: null,
    first_generation: false,
    military_family: false,
    needs_fafsa: true,
    other: "Must attend a qualifying California college",
  },
  description: "Helps California students pay tuition.",
  checked_at: "2026-09-28",
};

describe("parseFile", () => {
  it("flattens a valid entry into a database row", () => {
    const [record] = parseFile("ca.json", [entry]);
    expect(record).toMatchObject({
      status: "valid",
      id: "ca-cal-grant-a",
      value: { deadline_kind: "usually", deadline_month_day: "03-02", deadline_date: null, state: "CA", min_gpa: 3, award_max: 14226, other_requirements: "Must attend a qualifying California college" },
    });
  });

  it("rejects an entry in the wrong file", () => {
    expect(parseFile("tx.json", [entry])[0]).toMatchObject({ status: "rejected", reason: 'id must start with "tx-"' });
  });

  it("rejects a state program without its state, and a federal one with a state", () => {
    const noState = { ...entry, rules: { ...entry.rules, state: null } };
    expect(parseFile("ca.json", [noState])[0]).toMatchObject({ status: "rejected" });
    const federal = { ...entry, id: "us-thing", sponsor_type: "federal" };
    expect(parseFile("federal.json", [federal])[0]).toMatchObject({ status: "rejected" });
  });

  it("rejects http links, bad dates, dashes and a min above the max", () => {
    const bad = [
      { ...entry, url: "http://www.csac.ca.gov" },
      { ...entry, deadline: { kind: "date", date: "2027-02-30" } },
      { ...entry, description: "Tuition help — for Californians." },
      { ...entry, award: { min: 5000, max: 100, text: null } },
    ];
    expect(parseFile("ca.json", bad).map((r) => r.status)).toEqual(["rejected", "rejected", "rejected", "rejected"]);
  });
});

describe("readOfficialList", () => {
  function dirWith(files: Record<string, unknown>) {
    const dir = mkdtempSync(join(tmpdir(), "scholarships-"));
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), JSON.stringify(body));
    return pathToFileURL(`${dir}/`);
  }

  it("reads every file in the folder", async () => {
    const federal = { ...entry, id: "us-pell", sponsor_type: "federal", rules: { ...entry.rules, state: null } };
    const result = await readOfficialList(dirWith({ "ca.json": [entry], "federal.json": [federal] }));
    expect(result.status === "fetched" && result.records.map((r) => r.id)).toEqual(["ca-cal-grant-a", "us-pell"]);
  });

  it("fails on a duplicate id", async () => {
    await expect(readOfficialList(dirWith({ "ca.json": [entry, entry] }))).rejects.toThrow("Duplicate scholarship id");
  });
});
