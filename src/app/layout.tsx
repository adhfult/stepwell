import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bitter } from "next/font/google";
import "./globals.css";

// Self-hosted by next/font: students' browsers never contact Google.
// The CSS variables are used by globals.css (body and headings).
const bitter = Bitter({ subsets: ["latin"], variable: "--font-bitter", display: "swap" });
// Next.js has no size metrics for Atkinson Hyperlegible Next yet, so the build
// warns "Failed to find font override values". Harmless: without a
// size-matched fallback, text may shift slightly when the font arrives.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stepwell",
  description: "Helps students connect careers to programs and colleges using official U.S. data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bitter.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
