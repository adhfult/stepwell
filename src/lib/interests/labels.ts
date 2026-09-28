import type { Area } from "./scoring";

/**
 * The six interest areas in plain words (DESIGN.md "Writing"), based on
 * O*NET's RIASEC definitions. The names are O*NET's, so they match what a
 * school counselor would use.
 */
export const AREA_TEXT: Record<Area, { name: string; description: string }> = {
  realistic: {
    name: "Realistic",
    description: "Hands-on work: building, fixing, using tools and machines, working with plants or animals, often outdoors.",
  },
  investigative: {
    name: "Investigative",
    description: "Working with ideas: researching, figuring out how things work, and solving problems.",
  },
  artistic: {
    name: "Artistic",
    description: "Creating things: art, music, writing, design, and performing, with room for your own style.",
  },
  social: {
    name: "Social",
    description: "Working with people: helping, teaching, caring for, and serving others.",
  },
  enterprising: {
    name: "Enterprising",
    description: "Leading and persuading: starting projects, making decisions, selling ideas, and business.",
  },
  conventional: {
    name: "Conventional",
    description: "Organizing: following clear steps, and keeping data, records, and details in order.",
  },
};

export const ANSWER_OPTIONS = [
  { value: 1, label: "Strongly dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Unsure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly like" },
] as const;

/** "Realistic, Social and Artistic" */
export function listNames(areas: Area[]) {
  const names = areas.map((a) => AREA_TEXT[a].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}
