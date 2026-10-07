# 0015: Local scholarships as links, and the student's county

- Date: 2026-10-06
- Status: accepted (spec `more-scholarships.md`)

## Context
Students miss local awards (community foundations, colleges' own
scholarships) most. Reading those pages to copy each award needs a paid
scraping service or a local AI model; the owner ruled out paying, and the
owner's local model took 9 minutes a page (measured 2026-10-06), so 500
pages would take days. Local awards are usually limited to one county, and
the profile only stored a state. Users may be 13 to 17.

## Decision
- Stepwell **links** to local sources instead of copying their awards: a
  reviewed file per state (`data/award-sites/`) with each foundation's or
  college's name, who it serves and its scholarship page. Linking isn't
  reading a site, so decision 0007's terms checks don't apply to it. A
  monthly job checks every link still answers.
- The profile gets an **optional county** (Census FIPS code). It is the only
  new personal data: chosen by the student, "Not set" by default, cleared
  when the state changes, readable and changeable only by the student
  (existing RLS and column grants), deleted with the account, never shared or
  logged. It's used only to order the local list.
- Private national programs join the hand-checked list (`private.json`),
  checked on their official pages like the state ones.

## Alternatives considered
- context.dev or another paid scraper: costs money every month (owner: no).
- The local model reading every page: free but days per batch.
- No county, showing every foundation in the state: no new data, but long
  lists of awards a student can't get.
- A county filter in the page address only: less data stored, but students
  would pick it again on every visit; the owner chose to save it.

## Consequences
- Local award amounts and deadlines appear only on the foundations' sites.
- Each new state is a research pass and a reviewed commit.
