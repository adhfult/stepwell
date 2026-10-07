// The local scholarship directory (spec more-scholarships.md): community
// foundations and colleges with a public scholarship page, linked, never
// copied. One reviewed file per state in data/award-sites/; add a state by
// importing its file below (a test checks none is missing).
import { z } from "zod";
import ca from "../../../data/award-sites/ca.json";
import tx from "../../../data/award-sites/tx.json";

export const siteSchema = z
  .object({
    id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/),
    name: z.string().trim().min(1).max(120),
    kind: z.enum(["foundation", "college"]),
    unitid: z.number().int().positive().optional(),
    // 5-digit FIPS codes; empty means the whole state.
    counties: z.array(z.string().regex(/^\d{5}$/)),
    url: z.url({ protocol: /^https$/ }),
    serves: z.string().trim().min(1).max(140),
    checked_on: z.iso.date(),
  })
  .refine((s) => (s.kind === "college") === (s.unitid !== undefined), {
    error: "College entries need a unitid; foundations must not have one",
    path: ["unitid"],
  });

export type Site = z.infer<typeof siteSchema>;

/** State code -> its reviewed directory file. */
export const FILES: Record<string, Site[]> = {
  CA: ca as Site[],
  TX: tx as Site[],
};

/** Foundations for the student's county first, then statewide ones. Colleges show on their own pages. */
export function localSources(sites: Site[], county: string | null): Site[] {
  const foundations = sites.filter((s) => s.kind === "foundation");
  const near = county ? foundations.filter((s) => s.counties.includes(county)) : [];
  return [...near, ...foundations.filter((s) => s.counties.length === 0)];
}

const byUnitid = new Map(
  Object.values(FILES)
    .flat()
    .filter((s) => s.unitid !== undefined)
    .map((s) => [s.unitid, s]),
);

/** A college's own scholarship page, if the directory lists it. */
export const collegeScholarships = (unitid: number) => byUnitid.get(unitid) ?? null;
