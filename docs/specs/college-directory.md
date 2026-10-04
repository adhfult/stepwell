# Spec: College directory

- Status: built 2026-10-04 (local; cloud migration and import wait for the owner)

## Goal
Let students browse and filter every college in College Scorecard, not only
the ones reached from a career, and open a page per college with its
facts, cost by family income, test scores and programs. Project 1 of
`pre-launch-roadmap.md`; the GPA tools and NCAA path build on it.

## User story
As a high school student, I want to find colleges that fit my state,
budget, scores and the setting I like, and see each one's real numbers, so
that I can build a list worth applying to.

## Acceptance criteria
### Data
- [x] The Scorecard import also stores, per college (names checked in the
      official data dictionary, `CollegeScorecardDataDictionary.xlsx`):
  - [x] SAT 25th and 75th percentiles, reading and math
        (`latest.admissions.sat_scores.{25th,75th}_percentile.{critical_reading,math}`)
  - [x] ACT composite 25th and 75th percentiles
        (`latest.admissions.act_scores.{25th,75th}_percentile.cumulative`)
  - [x] Test policy (`latest.admissions.test_requirements`: required,
        recommended, considered but not required, neither, unknown)
  - [x] Net price for the five income brackets ($0-30k, $30-48k, $48-75k,
        $75-110k, $110k+), public or private set by ownership
  - [x] Setting: city, suburb, town or rural (`school.locale` 11-43)
  - [x] Two-year or four-year (`school.degrees_awarded.predominant`)
  - [x] Minority-serving flags: HBCU, Hispanic-serving, tribal, AANAPISI,
        Alaska Native or Native Hawaiian, predominantly Black, Native
        American non-tribal (`school.minority_serving.*`)
- [x] Missing values stay null and show "Not reported"; a bad field skips
      that field's value, not the college.

### /colleges
- [x] A band with a name search, then a filter form (plain GET form,
      works without JavaScript): state, public / private nonprofit /
      for-profit, size (small under 5,000, medium 5,000 to 15,000, large
      over 15,000), most I'd pay (net price for a chosen income bracket;
      with no bracket picked, the existing average `net_price`),
      admission rate (under 25%, 25 to 50%, 50 to 75%, over 75%), test
      policy (test-optional means anything but "required"), setting,
      two-year or four-year, minority-serving, and "has a program in"
      (matches program titles).
- [x] Sort by name, size, or net price; 24 per page with page links and a
      total ("1,204 colleges").
- [x] Optional "My SAT" or "My ACT" field marks each row with a test-score
      range: "below the middle 50%", "in the middle 50%" or "above the
      middle 50%". SAT compares to reading plus math percentiles, and the
      page says this is approximate. Scores are never stored.
- [x] Each row: name (links to its page), city and state, type, size,
      net price (for the chosen bracket when one is picked) and admission
      and graduation rate as `Meter`s, and the test range when reported.
- [x] Empty state: "No colleges match. Remove a filter." with a link that
      clears filters. Skeleton while loading; an error boundary.
- [x] "Colleges" in the main navigation; it fits at 1024px.

### /colleges/[unitid]
- [x] Facts: location, setting, type (ownership, two- or four-year,
      minority-serving), size, admission rate, test policy with SAT and
      ACT ranges, graduation rate, website.
- [x] Net price by family income: five rows with `Meter`s on the
      existing net price scale.
- [x] Every program, grouped by credential level, with graduates'
      earnings and debt.
- [x] Save button (existing `SaveButton kind="college"`); signed-out
      saving sends students to sign in and back.
- [x] College Scorecard source line under the numbers.
- [x] An unknown or malformed id is a 404.
- [x] College names on the career colleges page link here.

### Everywhere
- [x] No horizontal overflow, console or CSP errors at 320/390/1280;
      CLS at most 0.1; every filter usable by keyboard.
- [x] Nothing from `docs/design/AVOID.md`.

## Data
- New nullable columns on `public.institutions` (one migration):
  `sat_read_25`, `sat_read_75`, `sat_math_25`, `sat_math_75`, `act_25`,
  `act_75`, `test_policy` (text, checked), `net_price_by_income`
  (integer[5]), `locale` (text: city/suburb/town/rural), `two_year`
  (boolean), `serves` (text[] of flags), each with range checks.
  `merge_institutions` sets them. RLS unchanged: public read, importer
  writes.
- New RPC `search_colleges(...)`: security invoker, `search_path = ''`,
  execute granted to anon and authenticated; validates every argument;
  returns rows plus a total count. Name and program matching use `ilike`
  with escaped wildcards (about 5,800 colleges, no new index).
- Nothing new is stored about students. Income bracket and test scores
  live only in the URL of their own browser.

## Edge cases and errors
- A college reports SAT but not ACT (or neither): the row shows what
  exists; the fit marker shows only for the test the student entered.
- Test policy "required" with no reported scores: show the policy only.
- Page number beyond the last page: show the last page.
- Malformed filter values are ignored (zod `.catch`), like the other
  list pages.
- Two-year colleges have no SAT/ACT; the fit marker skips them.

## Out of scope
- Combining SAT and ACT through the concordance, GPA, and reach/match
  advice beyond the score range (project 2).
- Sports and divisions (project 3).
- Maps, distance from home, photos, rankings.
- Comparing colleges side by side.

## Test plan
- Unit: Scorecard parser with an updated fixture (new fields, missing
  values), filter schema, fit marker, locale and policy labels.
- pgTAP: `search_colleges` filters (each one), combination, paging and
  total, invalid arguments rejected, anon can execute, the new columns'
  checks.
- Import run against the local database: SAT/ACT present for most
  four-year colleges.
- Production build, Playwright at 320/390/1280: filter combinations,
  paging, fit marker, college page, 404, save while signed out, overflow,
  console/CSP, CLS, keyboard only.
