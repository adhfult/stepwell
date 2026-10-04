# 0011: Teal bands, a dark footer and drawn numbers

- Date: 2026-10-04
- Status: accepted (the owner found the UI still dull after 0010 and chose
  "bolder, same palette" plus "data you can see", on all pages)

## Context
After 0010 every surface was still pale mineral: page, panels and the
stepwell slabs sat at nearly one value, and teal only appeared as thin link
text. On desktop the home hero left half the screen empty with the stepwell
below the fold. Pay, cost, debt and graduation rates (Stepwell's most
useful content) were plain sentences.

## Decision
- **Bands:** the title area of browsing pages (home, careers, a career,
  colleges, scholarships, internships, programs, interest quiz, plan) sits
  on a full-width `primary` band with `surface` text. Form, legal and
  account pages stay plain.
- **Frame:** the footer is `foreground` (dark stone) with `surface` text;
  the header marks the current section with a 4px `primary` bar.
- **Home hero:** headline, search and the 3D stepwell share one band, so
  the scene is above the fold on a laptop.
- **Data graphics:** small inline SVG bars (track `border-subtle`, fill
  `primary`) beside pay, earnings, debt, net price and graduation rate, on
  fixed scales so a bar means the same thing on every page. The number is
  always printed; the bar is a sketch of it.
- No new colors, fonts or motion.

## Alternatives considered
- **A new palette:** the palette passes contrast and fits the idea; the
  problem was how little of it showed.
- **A chart library:** a bar is a few lines of SVG; a library would be a
  dependency for nothing.
- **Bars scaled to the longest in the list:** looks fuller, but then the
  same pay draws different lengths on different pages.

## Consequences
- Inside bands the focus outline is `surface` and secondary text is
  `border-subtle` (the usual `foreground` outline and `muted` text fail
  contrast on teal).
- Bars are sized with SVG attributes, not `style=`, because the CSP blocks
  server-rendered inline styles.
