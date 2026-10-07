---
name: award-sites-research
description: Research and add one state's local scholarship directory file (data/award-sites/<state>.json) for Stepwell. Use when asked to add, extend or fill gaps in a state's local scholarships (community foundations, colleges' own scholarship pages).
---

# Add a state's local scholarship file

Spec: `docs/specs/more-scholarships.md`, decision 0015. We LINK to pages, never copy awards. Free tools only.

1. `npm run db:start` if needed, then `npm run award-sites:gaps -- <ST>`: counties with no foundation, biggest colleges not listed.
2. Foundations: find community foundations that publish a scholarship page for students (the state's
   community foundation association lists members). Skip donor pages, news posts and pages with no student awards.
3. Colleges: start with the biggest from step 1. Use the college's own financial aid scholarship page.
   Blackbaud AcademicWorks pages are fine to LINK (their terms only forbid scraping).
4. Vet every URL before adding it: `npm run award-sites:check -- <url>` must say "answers 200",
   and the title or landing address must fit. Use the "lands on" address if it redirects.
5. Write entries (schema `siteSchema` in `src/lib/scholarships/local.ts`):
   - `id` `<st>-...` (`<st>-cf-<place>` for foundations), unique.
   - `counties`: 5-digit FIPS from `data/counties.json` the foundation's own page names; `[]` = statewide.
     Colleges: `[]` plus `unitid` from step 1's list.
   - `serves`: at most 140 characters, only what the page says. No invented eligibility, amounts or deadlines.
   - `checked_on`: today.
6. New state: add `import <st> from "../../../data/award-sites/<st>.json";` and `<ST>: <st> as Site[]` to `FILES`
   in `local.ts`.
7. Verify: `npx vitest run src/lib/scholarships src/jobs/award-sites-gaps.test.ts`,
   `npm run award-sites:gaps -- <ST>` (no "Not a <ST> college" line), `npm run award-sites:check`.
8. One commit per state, `data: <State> local scholarship directory (N foundations, M colleges)`, body listing
   gaps left. The owner approves each state before it is pushed.
