/**
 * Stone steps stepping down into the next section (DESIGN.md "Intro page"):
 * drawn in the next section's color over the current one's. Decoration only.
 */
const COLORS = { band: ["bg-primary", "fill-primary"], page: ["bg-background", "fill-background"] } as const;

export function StepEdge({ from, to }: { from: keyof typeof COLORS; to: keyof typeof COLORS }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 32" preserveAspectRatio="none" className={`block h-6 w-full sm:h-8 ${COLORS[from][0]}`}>
      <path d="M0 32V0h100v8h100v8h100v8h100v8z" className={COLORS[to][1]} />
    </svg>
  );
}
