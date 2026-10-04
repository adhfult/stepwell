import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Self-hosted by next/font: students' browsers never contact Google.
// The CSS variables are used by globals.css (body and headings).
// opsz: the letters adjust their shape to the size they are shown at.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});
// Next.js has no size metrics for Atkinson Hyperlegible Next yet, so the build
// warns "Failed to find font override values". Harmless: without a
// size-matched fallback, text may shift slightly when the font arrives.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Stepwell", template: "%s | Stepwell" },
  description: "Helps students connect careers to programs and colleges using official U.S. data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Lets keyboard users jump past the header; visible only when focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-10 focus:bg-surface focus:px-4 focus:py-3"
        >
          Skip to main content
        </a>
        <SiteHeader />
        {/* min-h-svh: the footer starts below the fold, so a short loading skeleton
            swapping for real content never pushes it (layout shift). */}
        <main id="main" className="min-h-svh flex-1">
          {/* Page changes crossfade (DESIGN.md motion budget); header and footer stay put. */}
          <ViewTransition>{children}</ViewTransition>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
