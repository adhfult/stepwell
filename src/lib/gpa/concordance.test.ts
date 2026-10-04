import { describe, expect, it } from "vitest";
import { actToSat, satToAct } from "./concordance";

// Rows read off ACT-SAT-Concordance-Tables.pdf (2018).
describe("concordance", () => {
  it("matches Table A2 (ACT to SAT)", () => {
    expect(actToSat(36)).toBe(1590);
    expect(actToSat(28)).toBe(1310);
    expect(actToSat(21)).toBe(1080);
    expect(actToSat(9)).toBe(590);
    expect(actToSat(8)).toBeNull();
  });

  it("matches Table A1 (SAT to ACT)", () => {
    expect(satToAct(1600)).toBe(36);
    expect(satToAct(1570)).toBe(36);
    expect(satToAct(1560)).toBe(35);
    expect(satToAct(1300)).toBe(28);
    expect(satToAct(1290)).toBe(27);
    expect(satToAct(1060)).toBe(21);
    expect(satToAct(1050)).toBe(20);
    expect(satToAct(590)).toBe(9);
    expect(satToAct(580)).toBeNull();
  });
});
