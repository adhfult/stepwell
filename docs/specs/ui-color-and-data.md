# Spec: Bolder color and visible data

- Status: built (2026-10-04; decision 0011)

## Goal
Make Stepwell feel less flat by using Water and Stone at full strength
(teal bands, a dark footer, the stepwell above the fold) and by drawing the
numbers students compare (pay, cost, debt, graduation rate) as small bars.

## User story
As a student skimming careers and colleges, I want the important numbers
to stand out and be easy to compare, so I can tell options apart at a glance.

## Acceptance criteria
Frame
- [x] Header marks the current section: 4px `primary` bar and `aria-current="page"`.
- [x] Wordmark has a small custom SVG mark (stepped blocks) beside "Stepwell".
- [x] Footer on `foreground` with `surface` text and links.

Bands
- [x] Home, careers, a career, colleges, scholarships, internships, programs,
      interest quiz and plan show their title area on a full-width `primary` band.
- [x] Inside bands: text `surface`, secondary text `border-subtle`, focus
      outline `surface`, buttons use the band variant.
- [x] Each of those pages' loading skeleton has the same band, and CLS stays 0.
- [x] The career band shows median pay and the outlook name.

Home
- [x] Headline, search and the 3D stepwell share the band; the scene is above
      the fold at 1280x900. Choosing a slab still works without JavaScript.

Data graphics
- [x] Career "Pay and outlook" shows a range bar (low to high, median tick)
      for annual pay.
- [x] Career search rows show median pay as a bold figure with a mini bar.
- [x] College rows show labeled meters: all four from 640px, graduation rate
      and net price under 640px.
- [x] Bars use fixed caps: pay $200,000, earnings $150,000, debt $100,000,
      net price $60,000, graduation rate 100%; over the cap the bar is full.
- [x] Bars are `aria-hidden`; the number is always printed beside them.
- [x] `src/lib/scale.ts` has a test.

Everywhere
- [x] Zero CSP and console errors; no sideways scroll at 320, 390, 1280.
- [x] Every changed page checked against AVOID.md.

## Result
Checked on a production build: 10 pages (home, careers search, a career,
colleges, scholarships, internships, programs, quiz, plan, sign-in) at 320,
390 and 1280px: no sideways scroll, zero console or CSP errors, layout
shift at most 0.01. The home scene's water ends at 510px on a 1280x900
screen. Slabs switch by click and arrow keys; their focus outline on the
band is 3px `surface`. `npm run check`: 193 tests pass.

Changes from the plan while building:
- No separate `band.tsx` or `band` button kind: `<Band>` lives in
  `src/components/page.tsx` (it shares the widths), and `.band` in
  `globals.css` remaps links, muted text, focus, primary buttons, errors
  and skeleton blocks, so forms need no new props.
- The career page's path moved to a side column from 1024px (the page
  was a narrow column with empty sides).
- College meters are "label ... value" on one line with the bar below,
  which reads better at 320px than label, bar and value on one line.
- `netPriceText` and `rateText` lost their last callers and were removed.

## Data
No new data or tables. Bars read values pages already load.

## Edge cases and errors
- Missing value ("Not reported"): text only, no bar.
- Hourly-only pay: text only, no bar.
- Value over the cap: full bar, real number printed.

## Out of scope
New colors or fonts, dark mode, animated bars, a chart library.

## Test plan
`npm run check` (including `scale.test.ts`); production build checked with
Playwright at 320/390/1280 for overflow, CSP errors and layout shift;
keyboard pass over the band and the stepwell.
