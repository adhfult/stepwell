/**
 * Sports and athletics levels from EADA (spec ncaa-athlete-path.md). Names
 * checked against the 2024-25 schools.xlsx on 2026-10-04.
 */

export const SPORTS = [
  { value: "archery", label: "Archery" },
  { value: "badminton", label: "Badminton" },
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "beach-volleyball", label: "Beach volleyball" },
  { value: "bowling", label: "Bowling" },
  { value: "cross-country", label: "Cross country" },
  { value: "diving", label: "Diving" },
  { value: "equestrian", label: "Equestrian" },
  { value: "fencing", label: "Fencing" },
  { value: "field-hockey", label: "Field hockey" },
  { value: "football", label: "Football" },
  { value: "golf", label: "Golf" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "ice-hockey", label: "Ice hockey" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "rifle", label: "Rifle" },
  { value: "rodeo", label: "Rodeo" },
  { value: "rowing", label: "Rowing" },
  { value: "sailing", label: "Sailing" },
  { value: "skiing", label: "Skiing" },
  { value: "soccer", label: "Soccer" },
  { value: "softball", label: "Softball" },
  { value: "squash", label: "Squash" },
  { value: "swimming", label: "Swimming and diving" },
  { value: "synchronized-swimming", label: "Synchronized swimming" },
  { value: "table-tennis", label: "Table tennis" },
  { value: "tennis", label: "Tennis" },
  { value: "track", label: "Track and field" },
  { value: "volleyball", label: "Volleyball" },
  { value: "water-polo", label: "Water polo" },
  { value: "weight-lifting", label: "Weightlifting" },
  { value: "wrestling", label: "Wrestling" },
] as const;

/** EADA's `Sports` names to our slugs. A combined sport's counts go to its first slug (src/jobs/sources/eada.ts); "Other Sports" is skipped (empty list). */
export const EADA_SPORTS: Record<string, string[]> = {
  Archery: ["archery"],
  Badminton: ["badminton"],
  Baseball: ["baseball"],
  Basketball: ["basketball"],
  "Beach Volleyball": ["beach-volleyball"],
  Bowling: ["bowling"],
  "Cross Country": ["cross-country"],
  Diving: ["diving"],
  Equestrian: ["equestrian"],
  Fencing: ["fencing"],
  "Field Hockey": ["field-hockey"],
  Football: ["football"],
  Golf: ["golf"],
  Gymnastics: ["gymnastics"],
  "Ice Hockey": ["ice-hockey"],
  Lacrosse: ["lacrosse"],
  "Other Sports": [],
  Rifle: ["rifle"],
  Rodeo: ["rodeo"],
  Rowing: ["rowing"],
  Sailing: ["sailing"],
  Skiing: ["skiing"],
  Soccer: ["soccer"],
  Softball: ["softball"],
  Squash: ["squash"],
  Swimming: ["swimming"],
  "Swimming and Diving (combined)": ["swimming", "diving"],
  "Synchronized Swimming": ["synchronized-swimming"],
  "Table Tennis": ["table-tennis"],
  Tennis: ["tennis"],
  "Track and Field (Indoor)": ["track"],
  "Track and Field (Outdoor)": ["track"],
  "Track and Field and Cross Country (combined)": ["track", "cross-country"],
  Volleyball: ["volleyball"],
  "Water Polo": ["water-polo"],
  "Weight Lifting": ["weight-lifting"],
  Wrestling: ["wrestling"],
};

export const TEAMS = [
  { value: "women", label: "Women’s team" },
  { value: "men", label: "Men’s team" },
] as const;

/** Filter groups; the codes must match search_colleges() in the athletics migration. */
export const LEVEL_GROUPS = [
  { value: "d1", label: "NCAA Division I", codes: [1, 2, 3] },
  { value: "d2", label: "NCAA Division II", codes: [4, 5] },
  { value: "d3", label: "NCAA Division III", codes: [6, 7] },
  { value: "naia", label: "NAIA", codes: [9, 10] },
  { value: "juco", label: "Junior and community college (NJCAA, CCCAA, NWAC)", codes: [12, 13, 14, 17, 19] },
  { value: "other", label: "Other (NCCAA, USCAA, independent)", codes: [8, 15, 16, 18, 20] },
] as const;

const LEVEL_NAMES: Record<number, string> = {
  1: "NCAA Division I (FBS football)",
  2: "NCAA Division I (FCS football)",
  3: "NCAA Division I (no football)",
  4: "NCAA Division II (with football)",
  5: "NCAA Division II (no football)",
  6: "NCAA Division III (with football)",
  7: "NCAA Division III (no football)",
  8: "Other association",
  9: "NAIA Division I",
  10: "NAIA Division II",
  12: "NJCAA Division I",
  13: "NJCAA Division II",
  14: "NJCAA Division III",
  15: "NCCAA Division I",
  16: "NCCAA Division II",
  17: "CCCAA (California community colleges)",
  18: "Independent",
  19: "NWAC (Northwest community colleges)",
  20: "USCAA",
};

export const levelName = (code: number | null) => (code === null ? null : (LEVEL_NAMES[code] ?? null));
export const sportLabel = (value: string) => SPORTS.find((s) => s.value === value)?.label ?? value;
