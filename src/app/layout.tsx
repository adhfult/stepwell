import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "stepwell",
  description: "Helps students connect careers to programs and colleges using official U.S. data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
