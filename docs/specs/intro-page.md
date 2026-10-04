# Spec: Intro page

- Status: draft

## Goal
Make `/` a real introduction for people who find Stepwell: the hero stays,
and below it the page walks one real example down the four steps with live
numbers from our own tables. Most of Stepwell's decoration lives here, so
the app pages can get calmer later (separate spec).

## User story
As a student who just found the site, I want to see what Stepwell actually
shows for a real career before I search, so that I know whether it's worth
my time.

## Acceptance criteria
- [ ] The hero is unchanged: headline, career search, quiz link and the 3D
      stepwell in the teal band, above the fold at 1280x900.
- [ ] The stepwell slabs are links to `#step-1` to `#step-4`; the radio
      panels and the home screenshots are gone. Tilt and "You are here"
      stay; reduced motion turns tilt off.
- [ ] Four step sections follow Registered Nurses (`29-1141.00`) in Ohio,
      alternating teal band and stone surface, with a stepped SVG edge
      between them:
  - [ ] Step 1, career: median pay with its pay bar, outlook, and the
        O*NET source line.
  - [ ] Step 2, college: the best-paid Ohio program for the career, its
        earnings, debt, net price and graduation meters, and the College
        Scorecard source line.
  - [ ] Step 3, money: one Ohio or federal scholarship whose deadline has
        not passed, with award, deadline and its source line.
  - [ ] Step 4, plan: an example year heading with the career's first AP
        class, labeled as an example, and a link to start a plan.
- [ ] Each step ends with the links it has today (search careers, quiz,
      scholarships, internships, summer programs, plan).
- [ ] Below the steps: where the data comes from (agency names from the
      same list as /about-data, linking there), the privacy promise, and
      the search form again with the quiz link.
- [ ] Every number has a source line under it.
- [ ] `loading.tsx` shows a skeleton shaped like the hero and steps.
- [ ] No horizontal overflow, console or CSP errors at 320/390/1280;
      CLS at most 0.1.
- [ ] Nothing from `docs/design/AVOID.md`.

## Data
Read only, from tables we already fill: `getCareer`, `getApCourses`
(`src/lib/careers/data.ts`), `collegesForCareer` (`src/lib/colleges/data.ts`),
`matchScholarships` (`src/lib/scholarships/data.ts`). No new tables, no user
data, no government API calls per view. The page becomes dynamic (the
Supabase server client reads cookies); caching can come later.

The source list moves from `src/app/about-data/page.tsx` to
`src/lib/sources/list.ts` so both pages read one list.

## Edge cases and errors
- A loader returns nothing or fails: that step keeps its text and links
  and says "Live numbers for this step aren't available right now." The
  rest of the page renders.
- Every scholarship is closed: step 3 shows the fallback line.
- Signed-in visitors see the same page (home is the intro for everyone).

## Out of scope
- Calmer app pages, college detail pages, pay by state, work context
  (each gets its own spec).
- Choosing the example by the visitor's state or profile.
- Static caching of the home page.

## Test plan
- Unit test: the scholarship pick skips closed deadlines and returns null
  when all are closed.
- `npm run check`.
- Production build, Playwright at 320/390/1280: overflow, console/CSP
  errors, CLS, slab links land on their step, visible keyboard focus,
  reduced motion.
- Fallback: point the example at a code that doesn't exist and confirm the
  page renders with the fallback lines.
- AVOID.md checklist on the finished page.
