import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type College, findGaps } from "./award-sites-gaps.ts";

const college = (unitid: number): College => ({ unitid, name: `C${unitid}`, city: null, website: null, students: null });

describe("findGaps", () => {
  const counties = [["06001", "Alameda County"], ["06003", "Alpine County"]];
  const sites = [
    { id: "ca-cf-alameda", kind: "foundation" as const, counties: ["06001"] },
    { id: "ca-state", kind: "foundation" as const, counties: [] },
    { id: "ca-c1", kind: "college" as const, unitid: 1, counties: [] },
  ];

  it("lists counties no foundation names and colleges not yet listed", () => {
    const gaps = findGaps(sites, counties, [college(1), college(2)]);
    expect(gaps.counties).toEqual(["Alpine County"]);
    expect(gaps.colleges.map((c) => c.unitid)).toEqual([2]);
    expect(gaps.badUnitids).toEqual([]);
  });

  it("flags a unitid that isn't a college in the state", () =>
    expect(findGaps(sites, counties, [college(2)]).badUnitids).toEqual(["ca-c1"]));

  it("runs on the real California file", () => {
    const ca = JSON.parse(readFileSync(new URL("../../data/award-sites/ca.json", import.meta.url), "utf8"));
    const caCounties = JSON.parse(readFileSync(new URL("../../data/counties.json", import.meta.url), "utf8")).CA;
    const gaps = findGaps(ca, caCounties, []);
    expect(gaps.counties).toContain("San Francisco County");
    expect(gaps.badUnitids.length).toBe(19);
  });
});
