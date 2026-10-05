import { describe, expect, it } from "vitest";
import { parseEada, seasonOf } from "./eada.ts";

// Header names and positions as in the 2024-25 files (checked 2026-10-04); extra columns are ignored.
const inst = [
  ["unitid", "OPEID", "ClassificationCode", "classification_name"],
  [100654, "00100200", 1, "NCAA Division I-FBS"],
  [200, "00200000", 12, "NJCAA Division I"],
  [300, "00300000", 7, "NCAA Division III without football"],
];
const H = ["unitid", "SPORTSCODE", "Sports", "PARTIC_MEN", "PARTIC_WOMEN", "PARTIC_COED_MEN", "PARTIC_COED_WOMEN"];
const schools = [
  H,
  [100654, 1, "Baseball", 47, null, null, null],
  [100654, 2, "Basketball", 27, 20, null, null],
  // A combined row next to its split forms: one track row, larger counts win.
  [100654, 3, "Track and Field and Cross Country (combined)", 60, 55, null, null],
  [100654, 24, "Track and Field (Outdoor)", 70, 50, null, null],
  [100654, 25, "Cross Country", 12, 14, null, null],
  // Coed only: the coed counts fill in.
  [200, 36, "Sailing", null, null, 9, 7],
  [200, 29, "Other Sports", 5, 5, null, null],
  // No team for either sex: skipped.
  [300, 8, "Golf", null, null, null, null],
];

describe("parseEada", () => {
  it("builds one record per college with deduped sports", () => {
    const records = parseEada(inst, schools, 0);
    expect(records[0]).toEqual({
      status: "valid",
      id: "100654",
      value: {
        unitid: 100654,
        code: 1,
        sports: [
          { sport: "baseball", men: 47, women: null },
          { sport: "basketball", men: 27, women: 20 },
          { sport: "cross-country", men: 60, women: 55 },
          { sport: "track", men: 70, women: 55 },
        ],
      },
    });
    expect(records[1]).toMatchObject({ value: { unitid: 200, code: 12, sports: [{ sport: "sailing", men: 9, women: 7 }] } });
    expect(records[2]).toMatchObject({ value: { unitid: 300, code: 7, sports: [] } });
  });

  it("fails on a sport name it doesn't know, so a renamed file can't drop teams quietly", () => {
    expect(() => parseEada(inst, [H, [100654, 99, "Quidditch", 5, 5, null, null]], 0)).toThrow("Unknown EADA sport");
  });

  it("fails when a header is missing", () => {
    expect(() => parseEada([["unitid", "Code"]], schools, 0)).toThrow("instLevel header");
  });

  it("fails when far fewer colleges than expected", () => {
    expect(() => parseEada(inst, schools)).toThrow("only 3");
  });
});

describe("seasonOf", () => {
  it("names the academic year EADA's Year ends", () => expect(seasonOf(2025)).toBe("2024-25"));
});
