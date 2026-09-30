import { describe, expect, it } from "vitest";
import { parseFile, readOfficialPrograms } from "./official-programs.ts";

const good = {
  id: "ca-example-program",
  title: "Example Summer Research",
  sponsor: "University of California",
  sponsor_type: "university",
  kind: "research",
  url: "https://example.edu/program",
  stages: ["high_school"],
  states: ["CA"],
  remote: false,
  paid: true,
  pay_text: "$3,000 stipend",
  deadline: { kind: "usually", month_day: "02-15" },
  who_text: "California high school juniors",
  description: "Six weeks in a real lab.",
  checked_at: "2026-09-29",
};

describe("official programs", () => {
  it("flattens the deadline for the database", () => {
    const [r] = parseFile("ca.json", [good]);
    expect(r).toMatchObject({ status: "valid", value: { deadline_kind: "usually", deadline_month_day: "02-15", deadline_date: null } });
  });

  it("rejects entries in the wrong file, with dashes, or not on https", () => {
    expect(parseFile("ny.json", [good])[0]).toMatchObject({ status: "rejected", reason: 'id must start with "ny-"' });
    expect(parseFile("ca.json", [{ ...good, description: "Labs — and more" }])[0].status).toBe("rejected");
    expect(parseFile("ca.json", [{ ...good, url: "http://example.edu" }])[0].status).toBe("rejected");
  });

  it("reads every file in data/programs without rejects", async () => {
    const result = await readOfficialPrograms();
    expect(result.status === "fetched" && result.records.filter((r) => r.status === "rejected")).toEqual([]);
  });
});
