/**
 * Button looks from DESIGN.md "Buttons", shared by <button>s and links that
 * act like buttons. A plain module (not "use client") so Server Components
 * can use it too.
 */
const variants = {
  primary: "shadow-stone-edge bg-primary text-surface no-underline hover:bg-foreground hover:text-surface",
  secondary: "shadow-stone-edge-quiet border border-border-strong bg-surface text-foreground no-underline hover:border-foreground",
  delete: "shadow-stone-edge bg-accent text-surface no-underline hover:bg-foreground hover:text-surface",
  // DESIGN.md "Quiet": looks like a link, for low-stakes actions such as saving in a list.
  quiet: "text-primary underline decoration-1 underline-offset-[0.15em] hover:text-foreground hover:decoration-2",
} as const;

export type ButtonVariant = keyof typeof variants;

// DESIGN.md "Keycap movement": rise 2px on hover, sink flush when pressed.
// Movement and the bigger edge are motion-safe; under reduce motion only the
// color changes. Disabled buttons have no edge and don't move.
const keycap =
  "rounded-control px-4 font-bold transition-[translate,box-shadow,background-color,border-color] duration-150 ease-stone " +
  "motion-safe:hover:-translate-y-[2px] motion-safe:hover:shadow-stone-edge-lifted " +
  "motion-safe:active:translate-y-1 motion-safe:active:shadow-none " +
  "disabled:translate-y-0 disabled:shadow-none";

export function buttonClass(variant: ButtonVariant = "primary") {
  const shape = variant === "quiet" ? "" : keycap;
  return `inline-flex min-h-11 items-center ${shape} ${variants[variant]}`;
}
