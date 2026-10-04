"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// DESIGN.md "Page frame": main sections inline from 1024px (seven links don't
// fit on one line below that); on phones and tablets they sit behind a text
// button labeled "Menu" (no hamburger icon). <details> opens
// and closes without extra code and works with the keyboard.
const SECTIONS = [
  { href: "/careers", label: "Careers" },
  { href: "/colleges", label: "Colleges" },
  { href: "/gpa", label: "GPA" },
  { href: "/interests", label: "Interest quiz" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/internships", label: "Internships" },
  { href: "/programs", label: "Programs" },
  { href: "/plan", label: "My plan" },
];

// The current section gets a 4px primary bar underneath ("you are here").
const navLink =
  "inline-flex min-h-11 items-center border-y-4 border-transparent no-underline hover:underline focus-visible:underline aria-[current=page]:border-b-primary";

export function MainNav() {
  // The header stays mounted across pages; keying the menu to the path closes
  // it after the student picks a link.
  const pathname = usePathname();
  const current = (href: string) => (pathname.startsWith(href) ? "page" : undefined);

  return (
    <nav aria-label="Main">
      <ul className="hidden items-center gap-4 lg:flex">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} aria-current={current(s.href)} className={navLink}>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
      <details key={pathname} className="relative lg:hidden">
        <summary className={`${navLink} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Menu</summary>
        <ul className="absolute right-0 z-10 mt-1 w-48 border border-border-strong bg-surface py-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} aria-current={current(s.href)} className={`${navLink} w-full px-4`}>
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
