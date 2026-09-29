import { describe, expect, it } from "vitest";
import { parseCrosswalk } from "./onet-cip.ts";

// The layout of O*NET's Education_CIP_to_ONET_SOC.xlsx (2026-09-28): two
// title lines, then the header, then one row per program-career pair.
const top = [
  ["O*NET-SOC 2019 Crosswalks", "", "", ""],
  ["2020 Classification of Instructional Programs (CIP) to O*NET-SOC 2019", "", "", ""],
  ["2020 CIP Code", "2020 CIP Title", "O*NET-SOC 2019 Code", "O*NET-SOC 2019 Title"],
];
const rows = [
  ...top,
  ["01.0000", "Agriculture, General.", "19-1011.00", "Animal Scientists"],
  ["51.3801", "Registered Nursing/Registered Nurse.", "29-1141.00", "Registered Nurses"],
  ["1.0000", "Bad code", "19-1011.00", "Animal Scientists"],
];

describe("parseCrosswalk", () => {
  it("reads rows under the header and drops the trailing period from titles", () => {
    const records = parseCrosswalk(rows, 0);
    expect(records.slice(0, 2)).toEqual([
      { status: "valid", id: "19-1011.00 01.0000", value: { cip6: "01.0000", cip_title: "Agriculture, General", onet_code: "19-1011.00" } },
      {
        status: "valid",
        id: "29-1141.00 51.3801",
        value: { cip6: "51.3801", cip_title: "Registered Nursing/Registered Nurse", onet_code: "29-1141.00" },
      },
    ]);
    expect(records[2]).toMatchObject({ status: "rejected", reason: expect.stringContaining("cip6") });
  });

  it("fails when the header moves or is renamed", () => {
    expect(() => parseCrosswalk([["CIP", "Title", "SOC", "Title"], ...rows.slice(3)], 0)).toThrow("header not found");
  });

  it("fails when the file has far fewer rows than expected", () => {
    expect(() => parseCrosswalk(rows)).toThrow("only 2 usable rows");
  });
});
