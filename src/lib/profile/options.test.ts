import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gradYearLabel, STAGES, stageName, stateName, STATES } from "./options";

describe("profile answers as words", () => {
  it("names stages and states, and shortens the adult learner label", () => {
    expect(stageName("high_school")).toBe("High school");
    expect(stageName("adult_learner")).toBe("Adult learner");
    expect(stateName("OH")).toBe("Ohio");
    expect(stageName(null)).toBeNull();
    expect(stateName("ZZ")).toBeNull();
  });

  it("words the graduation question by stage and skips it for adult learners", () => {
    expect(gradYearLabel("college")).toContain("degree");
    expect(gradYearLabel("middle_school")).toContain("high school");
    expect(gradYearLabel("adult_learner")).toBeNull();
  });
});

// The profiles migration is the database's source of truth; the form's lists must match it.
const migrations = join(process.cwd(), "supabase", "migrations");
const sql = readFileSync(join(migrations, readdirSync(migrations).find((f) => f.endsWith("_profiles.sql"))!), "utf8");

function checkList(constraint: string): string[] {
  const body = sql.slice(sql.indexOf(`constraint ${constraint}`)).split(")")[0];
  return [...body.matchAll(/'([a-z_A-Z]+)'/g)].map((m) => m[1]);
}

describe("profile options", () => {
  it("offer exactly the stages the database accepts", () => {
    expect(STAGES.map((s) => s.value).sort()).toEqual(checkList("profiles_stage_valid").sort());
  });

  it("offer exactly the 56 state codes the database accepts, once each", () => {
    const codes = STATES.map((s) => s.value);
    expect(new Set(codes).size).toBe(56);
    expect([...codes].sort()).toEqual(checkList("profiles_state_valid").sort());
  });
});
