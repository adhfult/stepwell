/**
 * Button looks from DESIGN.md "Buttons", shared by <button>s and links that
 * act like buttons. A plain module (not "use client") so Server Components
 * can use it too.
 */
const variants = {
  primary: "bg-primary text-surface no-underline hover:bg-foreground hover:text-surface",
  secondary: "border border-border-strong bg-surface text-foreground no-underline hover:border-foreground",
  delete: "bg-accent text-surface no-underline hover:bg-foreground hover:text-surface",
  // DESIGN.md "Quiet": looks like a link, for low-stakes actions such as saving in a list.
  quiet: "text-primary underline decoration-1 underline-offset-[0.15em] hover:text-foreground hover:decoration-2",
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = "primary") {
  const shape = variant === "quiet" ? "" : "rounded-control px-4 font-bold";
  return `inline-flex min-h-11 items-center ${shape} ${variants[variant]}`;
}
