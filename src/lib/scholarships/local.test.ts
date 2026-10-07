import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCountyIn } from "@/lib/profile/counties";
import { FILES, type Site, siteSchema, localSources } from "./local";

const site = (id: string, counties: string[], kind: Site["kind"] = "foundation"): Site => ({
  id,
  name: id,
  kind,
  ...(kind === "college" && { unitid: 1 }),
  counties,
  url: `https://example.org/${id}`,
  serves: "Students",
  checked_on: "2026-10-06",
});

describe("localSources", () => {
  const sites = [site("ca-state", []), site("ca-la", ["06037"]), site("ca-sf", ["06075"]), site("ca-uc", [], "college")];

  it("lists the county's foundations first, then statewide ones, never colleges", () => {
    expect(localSources(sites, "06037").map((s) => s.id)).toEqual(["ca-la", "ca-state"]);
  });

  it("lists only statewide foundations without a county", () => {
    expect(localSources(sites, null).map((s) => s.id)).toEqual(["ca-state"]);
  });
});

describe("siteSchema", () => {
  it("needs a unitid for a college and none for a foundation", () => {
    expect(siteSchema.safeParse(site("ca-uc", [], "college")).success).toBe(true);
    expect(siteSchema.safeParse({ ...site("ca-uc", [], "college"), unitid: undefined }).success).toBe(false);
    expect(siteSchema.safeParse({ ...site("ca-x", []), unitid: 5 }).success).toBe(false);
  });

  it("refuses http links and long descriptions", () => {
    expect(siteSchema.safeParse({ ...site("ca-x", []), url: "http://example.org" }).success).toBe(false);
    expect(siteSchema.safeParse({ ...site("ca-x", []), serves: "x".repeat(141) }).success).toBe(false);
  });
});

describe("data/award-sites", () => {
  it("lists every file in the folder", () => {
    const onDisk = readdirSync(new URL("../../../data/award-sites/", import.meta.url)).filter((f) => f.endsWith(".json"));
    expect(Object.keys(FILES).map((s) => `${s.toLowerCase()}.json`).sort()).toEqual(onDisk.sort());
  });

  it("every entry is valid, in its state, with a unique id", () => {
    const ids = new Set<string>();
    for (const [state, sites] of Object.entries(FILES)) {
      for (const s of sites) {
        expect(siteSchema.safeParse(s).error?.issues).toBeUndefined();
        expect(s.id.startsWith(`${state.toLowerCase()}-`)).toBe(true);
        for (const c of s.counties) expect(isCountyIn(c, state), `${s.id} county ${c}`).toBe(true);
        expect(ids.has(s.id), s.id).toBe(false);
        ids.add(s.id);
      }
    }
  });
});
