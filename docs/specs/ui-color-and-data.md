# Spec: Bolder color and visible data

- Status: approved (2026-10-04, owner approved the plan; decision 0011)

## Goal
Make Stepwell feel less flat by using Water and Stone at full strength
(teal bands, a dark footer, the stepwell above the fold) and by drawing the
numbers students compare (pay, cost, debt, graduation rate) as small bars.

## User story
As a student skimming careers and colleges, I want the important numbers
to stand out and be easy to compare, so I can tell options apart at a glance.

## Acceptance criteria
Frame
- [ ] Header marks the current section: 4px `primary` bar and `aria-current="page"`.
- [ ] Wordmark has a small custom SVG mark (stepped blocks) beside "Stepwell".
- [ ] Footer on `foreground` with `surface` text and links.

Bands
- [ ] Home, careers, a career, colleges, scholarships, internships, programs,
      interest quiz and plan show their title area on a full-width `primary` band.
- [ ] Inside bands: text `surface`, secondary text `border-subtle`, focus
      outline `surface`, buttons use the band variant.
- [ ] Each of those pages' loading skeleton has the same band, and CLS stays 0.
- [ ] The career band shows median pay and the outlook name.

Home
- [ ] Headline, search and the 3D stepwell share the band; the scene is above
      the fold at 1280x900. Choosing a slab still works without JavaScript.

Data graphics
- [ ] Career "Pay and outlook" shows a range bar (low to high, median tick)
      for annual pay.
- [ ] Career search rows show median pay as a bold figure with a mini bar.
- [ ] College rows show labeled meters: all four from 640px, graduation rate
      and net price under 640px.
- [ ] Bars use fixed caps: pay $200,000, earnings $150,000, debt $100,000,
      net price $60,000, graduation rate 100%; over the cap the bar is full.
- [ ] Bars are `aria-hidden`; the number is always printed beside them.
- [ ] `src/lib/scale.ts` has a test.

Everywhere
- [ ] Zero CSP and console errors; no sideways scroll at 320, 390, 1280.
- [ ] Every changed page checked against AVOID.md.

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
