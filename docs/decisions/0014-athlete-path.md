# 0014: College athlete path data and rules

- Date: 2026-10-04
- Status: accepted (spec `ncaa-athlete-path.md`)

## Context
Roadmap project 3 needs colleges by sport and level, and an eligibility
check against each association's academic rules. Students may be 13 to 17.
The rules change most years and several published dates could not be
confirmed on official pages (2026-10-04).

## Decision
- Sports and levels come from EADA (U.S. Dept. of Education, public
  domain), imported monthly into our own tables like every other source
  (0003), keyed by the IPEDS `unitid` our `colleges` table already uses.
- The checker scores a rule only after it is confirmed on an official page,
  and stores its source URL and the date checked next to it. Unconfirmed
  rules and dates are shown as text with the official link. Every result is
  labelled an estimate; the associations decide.
- Class tags (core category, grade taken) live inside the existing
  `academic_records` row (0013), not a new table: same consent, purge and
  deletion, no new kind of data.
- No recruiting profiles or contact with colleges: nothing about a student
  leaves Stepwell.

## Alternatives considered
- A third-party sports or recruiting API: paid, and built around sending
  student profiles to coaches.
- Scraping NCAA or association pages for rules: they change layout often and
  the text is theirs; a short hand-written summary with links is clearer.
- A full rules engine covering every exception: more to keep correct each
  year than a student needs for a first check.

## Consequences
- The rules file needs a yearly review (each August, when the NCAA guide for
  the new year appears); its checked-on dates make stale rules visible.
- EADA lags a year (2024-25 data in 2026); the source line shows the year.
