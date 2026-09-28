# Design system: stepwell

**Status: chosen 2026-09-27.** Direction: **Water and Stone, with Wayfinding.**
This file is the source of truth for colors, type, spacing and shape. Every UI
change uses only these tokens and never anything in `docs/design/AVOID.md`.
If a new token is truly needed, add it here first and say why.

Reference screenshots you like can go in `docs/design/references/`.

## The idea
A stepwell is a set of stone stairs leading down to water. Stepwell's path
(careers, then programs, then colleges, then a plan) is drawn as a route line
descending terraced steps; each stop is a landing a student can save. Water
and Stone gives the palette, the square shapes and the calm. Wayfinding gives
the legible body type, the "you are here" signal color, and direct,
scannable signage-style copy.

## Colors
Contrast is WCAG 2 contrast ratio, measured against `background` unless noted.
Text needs 4.5:1; borders and other UI parts need 3:1.

| Token | Value | Used for | Contrast |
|---|---|---|---|
| background | `#E8EEEC` | Page background (pale mineral; never pure white) | |
| surface | `#F3F6F5` | Panels, set apart by tone instead of shadow | foreground on it 13.8:1 |
| foreground | `#132A2C` | Body text, headings, focus ring | 12.8:1 |
| muted | `#51615F` | Source lines, secondary text | 5.5:1 (6.0:1 on surface) |
| primary | `#0B5D66` | Links, buttons, the route line | 6.4:1; surface-colored text on it 7.0:1 |
| accent | `#A8323E` | Needs attention: deadlines soon, errors | 5.6:1; surface-colored text on it 6.1:1 |
| highlight | `#F2C12E` | Signal yellow: "you are here", "you qualify" | foreground on it 8.9:1 |
| border-strong | `#6E8380` | Form field borders | 3.4:1 (3.7:1 on surface) |
| border-subtle | `#C5D1CE` | Dividers only (never the only way to see a control) | |

Rules:
- **highlight is fill only.** It is 1.4:1 against the page, so it always
  carries dark (`foreground`) text or a `foreground` outline. It never marks
  something by color alone.
- **accent always comes with words.** An error or deadline says what it is
  in text; color is never the only signal.
- Only these colors exist in Tailwind (the default palette is switched off in
  `globals.css`), so `bg-white`, `text-purple-500` and similar do not compile.
- Light theme only for now (see Open items).

## Typography
- Headings: **Bitter** (sturdy slab serif), weights 600 to 700.
- Body, labels, numbers, forms: **Atkinson Hyperlegible Next** (from the
  Braille Institute; letters like l, I and 1 are never confused), weights 400
  and 700. Used for every dollar amount and date.
- Both load through `next/font/google`, which self-hosts the files: students'
  browsers never contact Google.
- Scale (17px base, ratio 1.25). Tailwind classes in brackets:

| Class | Size | Line height | Use |
|---|---|---|---|
| `text-sm` | 14px | 1.55 | Source lines, fine print (minimum size) |
| `text-base` | 17px | 1.55 | Body |
| `text-lg` | 21px | 1.2 | Small headings, lead text |
| `text-xl` | 27px | 1.2 | Section headings |
| `text-2xl` | 33px | 1.2 | Page headings (phone) |
| `text-3xl` | 42px | 1.2 | Page headings (wide screens) |

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.

## Spacing and shape
- Spacing scale (4px steps): 4, 8, 12, 16, 24, 32, 48, 64, 96 px. In
  Tailwind: `1, 2, 3, 4, 6, 8, 12, 16, 24`. Use only these steps.
- Corner radius: **0** for panels, sections and cards (cut stone);
  **2px** (`rounded-control`) for inputs and buttons only. No other radii
  exist in Tailwind (the default radius scale is switched off).
- No shadows. Separation comes from `surface` vs `background`, borders and space.
- Phone first: page side padding 24px (`px-6`), content width at most 672px
  (`max-w-2xl`) for reading pages.

## Icons and motion
- No icon library. A small custom SVG set only (route stops, step markers),
  drawn in `foreground` or `primary`.
- One motion moment in the whole product: the route line draws in once on a
  career's path page. Switched off under "reduce motion". Hover and focus
  change color or underline instantly; nothing moves.
- Focus: a visible `foreground` outline on every interactive element.

## Principles
Stepwell should feel calm and grounded: a place to think, not an ad to react
to. Copy is plain and specific, like a helpful older student giving
directions. Anything with a deadline stands out; everything else stays quiet.

## Open items
- **Dark mode is not designed yet.** The site is light only
  (`color-scheme: light`) until a dark palette is chosen and contrast-checked.
- **Fonts currently load in `src/app/page.tsx`**, so they apply to the
  starter page only. Before a second page is built, move the two font imports
  to `src/app/layout.tsx` (Next.js scopes fonts to the component that loads them).
- Terms and Privacy footer links are required by AVOID.md and do not exist
  yet (planned as the legal pages spec).
