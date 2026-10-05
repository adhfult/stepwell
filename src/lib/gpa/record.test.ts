import { describe, expect, it } from "vitest";
import { EMPTY_RECORD, keepTags, recordSchema } from "./record";

describe("recordSchema", () => {
  it("explains a cleared credits field in plain words", () => {
    const bad = { ...EMPTY_RECORD, courses: [{ name: "", type: "regular", grade: "A", credits: 0 }] };
    const out = recordSchema.safeParse(bad);
    expect(out.success).toBe(false);
    expect(out.error?.issues[0]?.message).toBe("Each class needs credits from 0.5 to 5");
  });

  it("refuses 81 classes and accepts the empty record", () => {
    const course = { name: "", type: "regular" as const, grade: null, credits: 1 };
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: Array(81).fill(course) }).success).toBe(false);
    expect(recordSchema.safeParse(EMPTY_RECORD).success).toBe(true);
  });
});

describe("recordSchema class tags", () => {
  const course = { name: "English 9", type: "regular", grade: "A", credits: 1 };
  it("keeps core and year (a /gpa save must not strip athlete tags)", () => {
    const parsed = recordSchema.parse({ ...EMPTY_RECORD, courses: [{ ...course, core: "english", year: 9 }] });
    expect(parsed.courses[0]).toEqual({ ...course, core: "english", year: 9 });
  });
  it("still accepts untagged classes", () => {
    expect(recordSchema.parse({ ...EMPTY_RECORD, courses: [course] }).courses[0]).toEqual(course);
  });
  it("refuses unknown tags", () => {
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: [{ ...course, core: "gym" }] }).success).toBe(false);
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: [{ ...course, year: 8 }] }).success).toBe(false);
  });
});

describe("keepTags", () => {
  const base = { type: "regular" as const, grade: "A" as const, credits: 1 };
  it("gives an untagged class the saved tags of the class with its name, so an old tab can't erase them", () => {
    const saved = [{ ...base, name: "English 9", core: "english" as const, year: 9 as const }, { ...base, name: "", core: "math" as const }];
    const incoming = [{ ...base, name: "English 9" }, { ...base, name: "" }, { ...base, name: "Art", year: 10 as const }];
    expect(keepTags(incoming, saved)).toEqual([
      { ...base, name: "English 9", core: "english", year: 9 },
      { ...base, name: "" },
      { ...base, name: "Art", year: 10 },
    ]);
  });

  it("fills each tag on its own, so a class with only a year still keeps its saved core area", () => {
    const saved = [{ ...base, name: "English 9", core: "english" as const, year: 9 as const }];
    expect(keepTags([{ ...base, name: "English 9", year: 9 }], saved)).toEqual([{ ...base, name: "English 9", core: "english", year: 9 }]);
  });
});
