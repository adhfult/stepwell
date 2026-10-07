import { describe, expect, it } from "vitest";
import { z } from "zod";
import { makeProfileSchema, toProfileUpdate } from "./schema";

const schema = makeProfileSchema(new Date(Date.UTC(2026, 8, 15)));
const valid = { nickname: "Sam", stage: "high_school", state: "OH", gradYear: "2029" };

const columns = (input: Record<string, string>) => toProfileUpdate(schema.parse(input));

function errorsFor(input: Record<string, string>) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("profile schema", () => {
  it("turns valid answers into database columns", () => {
    expect(columns(valid)).toEqual({ nickname: "Sam", stage: "high_school", state: "OH", grad_year: 2029, county: null });
  });

  it("keeps an optional county from the chosen state", () => {
    expect(columns({ ...valid, county: "39049" }).county).toBe("39049");
    expect(columns({ ...valid, county: "" }).county).toBeNull();
    expect(errorsFor({ ...valid, county: "06037" }).county).toEqual(["Choose a county in your state, or Not set"]);
    expect(errorsFor({ ...valid, county: "x" }).county).toBeDefined();
  });

  it("stores an empty or blank nickname as nothing, and trims the rest", () => {
    expect(columns({ ...valid, nickname: "   " }).nickname).toBeNull();
    expect(columns({ ...valid, nickname: "  Sam  " }).nickname).toBe("Sam");
  });

  it("rejects long nicknames and control characters", () => {
    expect(errorsFor({ ...valid, nickname: "x".repeat(41) }).nickname).toEqual(["Use 40 characters or fewer"]);
    expect(errorsFor({ ...valid, nickname: "Sam\nBob" }).nickname).toBeDefined();
  });

  it("requires a stage and a state from the lists", () => {
    const errors = errorsFor({ ...valid, stage: "", state: "" });
    expect(errors.stage).toEqual(["Choose where you are in school"]);
    expect(errors.state).toEqual(["Choose your state"]);
    expect(errorsFor({ ...valid, stage: "admin" }).stage).toBeDefined();
    expect(errorsFor({ ...valid, state: "ZZ" }).state).toBeDefined();
  });

  it("makes the graduation year optional and limits it to last year through 8 years ahead", () => {
    expect(columns({ ...valid, gradYear: "" }).grad_year).toBeNull();
    expect(columns({ ...valid, gradYear: "2025" }).grad_year).toBe(2025);
    expect(columns({ ...valid, gradYear: "2034" }).grad_year).toBe(2034);
    expect(errorsFor({ ...valid, gradYear: "2024" }).gradYear).toBeDefined();
    expect(errorsFor({ ...valid, gradYear: "2035" }).gradYear).toBeDefined();
    expect(errorsFor({ ...valid, gradYear: "soon" }).gradYear).toBeDefined();
  });

  it("clears the graduation year for adult learners, whatever was sent", () => {
    expect(columns({ ...valid, stage: "adult_learner", gradYear: "2029" }).grad_year).toBeNull();
  });
});
