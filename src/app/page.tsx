import { Atkinson_Hyperlegible_Next, Bitter } from "next/font/google";

// Fonts load here for now, so they apply to this page only (next/font scopes a
// font to the component that loads it). Move both to layout.tsx before adding
// a second page. See docs/design/DESIGN.md "Open items".
const bitter = Bitter({ subsets: ["latin"], variable: "--font-bitter", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

/**
 * Starter page. Replace it once docs/PRODUCT.md and docs/design/DESIGN.md
 * describe what this project is and how it should look.
 */
export default function Home() {
  return (
    <main className={`${bitter.variable} ${atkinson.variable} mx-auto max-w-2xl px-6 py-16 font-body`}>
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">Stepwell</h1>
      <p className="mt-4">Helps students connect careers to programs and colleges using official U.S. data.</p>
      <p className="mt-8 border border-border-subtle bg-surface px-4 py-3 text-sm text-muted">
        This page is a placeholder. Next steps are in <code>docs/PRODUCT.md</code>.
      </p>
    </main>
  );
}
