import type { ReactNode } from "react";

/**
 * The frame every page's content sits in (DESIGN.md "Layout"), so spacing
 * and widths live in one place. Phones get less top padding so content
 * starts higher; widths: reading 672px, short forms 448px, browsing 1024px.
 */
const widths = {
  reading: "max-w-2xl",
  form: "max-w-md",
  browse: "max-w-5xl",
} as const;

export function Page({ width = "reading", children }: { width?: keyof typeof widths; children: ReactNode }) {
  return <div className={`mx-auto ${widths[width]} px-6 py-8 sm:py-12 lg:px-8 lg:py-16`}>{children}</div>;
}

/**
 * DESIGN.md "Bands": the full-width primary strip a browsing page starts with
 * (title, intro, search). Same widths and side padding as <Page>; the colors
 * inside are remapped by `.band` in globals.css.
 */
export function Band({ width = "browse", children }: { width?: keyof typeof widths; children: ReactNode }) {
  return (
    <div className="band">
      <div className={`mx-auto ${widths[width]} px-6 py-8 sm:py-12`}>{children}</div>
    </div>
  );
}

/** The page's one h1: 27px on phones, 33px from 640px, 42px (53px for the home page's "hero") from 1024px. */
export function PageTitle({ size = "default", children }: { size?: "default" | "hero"; children: ReactNode }) {
  return <h1 className={`text-xl font-bold sm:text-2xl ${size === "hero" ? "lg:text-4xl" : "lg:text-3xl"}`}>{children}</h1>;
}
