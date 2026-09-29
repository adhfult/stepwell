# Spec: About the data page

- Status: draft (for the owner's review)

## Goal
One page that says where every number and listing on Stepwell comes from,
how fresh it is, and what it can't tell you, with each source's required
attribution (DESIGN.md "Sources"; O*NET requires attribution).

## User story
As a student, parent or counselor, I want to see where Stepwell's
information comes from and how current it is, so I know how far to trust it.

## Acceptance criteria
- [ ] `/about-data`, a reading page (`<Page>`, `<PageTitle>`, section
      headings `text-lg`), linked from the footer ("About the data", first,
      as DESIGN.md orders it).
- [ ] One section per source in `public.sources` (O*NET, its interest,
      crosswalk and outlook files, College Scorecard, the official
      scholarship list, USAJOBS): who publishes it, what Stepwell uses it
      for, its attribution text, a link to the publisher, and "Last updated
      (date)" from `last_success_at` ("Not loaded yet" when empty).
- [ ] A short "What this data can't tell you" section in plain words: pay
      is national unless it says otherwise, college outcomes are averages,
      scholarship and internship details change, and the official page has
      the final word. Stepwell's own judgments are named as ours (the AP
      class mapping, which scholarships were picked).
- [ ] O*NET's required attribution sentence and CC BY 4.0 link appear as
      O*NET asks.
- [ ] Works at 320px; AVOID.md check passes; `npm run check` passes.

## Data
Reads `public.sources` (already public read). Nothing stored.

## Edge cases and errors
- A source that has never loaded shows "Not loaded yet", not a blank date.
- Database error: the page still shows the static text; only the dates say
  "Couldn't load the update dates".

## Out of scope
A changelog of data releases, per-number provenance pop-ups, a Contact page
(waits for the contact address).

## Test plan
Unit: the date wording. By hand at 320px and 1280px: every source present,
links open, footer link on every page.

## Open questions
- Page path: `/about-data` (short) or `/about/data`?
