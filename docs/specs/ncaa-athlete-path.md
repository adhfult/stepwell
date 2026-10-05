# Spec: College athlete path

- Status: draft (design approved in chat 2026-10-04; this text awaits review)

## Goal
Help a student who wants to play a sport in college see which colleges
field their team at each level, what the academic bar is for each
association, how their own classes measure up, and what to do in each grade.
Project 3 of `pre-launch-roadmap.md`; it builds on the college directory and
the GPA tool. Every level: NCAA I, II, III, NAIA and junior colleges.

## User story
As a high school athlete, I want to find colleges with my team at a level I
can reach and know whether my classes keep me eligible, so I can plan my
classes and recruiting years ahead instead of finding out senior year.

## Acceptance criteria
- [ ] Monthly import of the U.S. Dept. of Education's Equity in Athletics
      Data Analysis (EADA): newest year from
      `ope.ed.gov/athletics/api/dataFiles/fileList`, skipped when the year
      matches the last import. Fills `colleges.athletics_code` (EADA
      classification) and `college_sports` (college, sport, men's and
      women's participant counts; null means no team).
- [ ] Combined EADA sports are split ("Track and Field and Cross Country"
      into track and cross country, "Swimming and Diving" into swimming and
      diving), one row per college and sport, keeping the larger count when
      both forms are reported.
- [ ] `/colleges` gains Sport, Team (men's or women's) and Level (NCAA I,
      II, III, NAIA, junior college, other) filters; bad values are ignored.
- [ ] A college page shows a Sports section after programs: its level and
      its men's and women's teams with roster sizes ("Women's soccer, 28
      athletes"), and the line "Source: U.S. Dept. of Education, Equity in
      Athletics Data Analysis (EADA), 2024-25". Hidden when the college is
      not in EADA.
- [ ] `/athletes` (in the Menu): pick a level (`?level=`), read Stepwell's
      summary of its rules with links to the official pages, check your
      classes, see the timeline by grade, and find teams (sport and team
      selects linking to the filtered directory).
- [ ] Signed in, each saved class from `/gpa` can be tagged with a core
      category (English; math; natural or physical science; extra English,
      math or science; social science; extra core) and the grade it was
      taken in (9 to 12). Tags are saved in the same record as the classes,
      and saving on `/gpa` keeps them.
- [ ] The checker scores only rules confirmed on an official page:
      NCAA I (16 core courses by category, 10 of them with 7 in English,
      math or science before senior year, core GPA 2.3), NCAA II (16 core by
      category, core GPA 2.2), NAIA (2.3 GPA, or two of: 2.0 GPA, top half
      of class, ACT 18 or SAT 970; class rank is a question on the page, not
      saved) and junior colleges once their rules are confirmed on njcaa.org
      or cccaasports.org. NCAA III shows that each college sets its own
      standards. Any rule we couldn't confirm is shown as text with the
      official link, never as a score.
- [ ] Every result shows what is missing (for example "1 more math") and
      says "Estimate, not an official certification" with a link to the body
      that decides (NCAA Eligibility Center, NAIA Eligibility Center).
- [ ] Unfinished classes (no grade yet) count toward planned courses but
      not toward the GPA or the 10/7 rule.
- [ ] The timeline by grade (9th to 12th) uses only confirmed steps; dates we
      couldn't confirm say "check your sport's recruiting calendar" with a
      link. Each rule and step records its source URL and the date checked.
- [ ] "Add to my plan" adds the timeline's steps to `/plan` as tasks in the
      right school year, once: steps already there are skipped. With no
      graduation year in the profile it asks for one, as `/plan` does.
- [ ] Signed out, `/athletes` explains everything and links to `/gpa` and
      sign in for the checker.
- [ ] EADA appears on About the data and in `docs/DATA_SOURCES.md`.

## Data
- `college_sports` and `colleges.athletics_code`: public government data,
  read-only to everyone like `colleges`, written only by the import job.
- Class tags (`core`, `year`) are two optional keys on each class in
  `academic_records.courses`. Same owner-only row, consent, 12-month purge
  and deletion as decision 0013; the database check accepts only known
  values. The Privacy page lists the tags. Nothing new is shared or logged.
- Rules and timeline are a hand-written file (`src/lib/athletes/rules.ts`),
  Stepwell's own words with links, never copied text.

## Edge cases and errors
- College in EADA but not in Scorecard: skipped and counted in the import
  log. College in Scorecard but not EADA: no Sports section; excluded when a
  sport or level filter is set.
- No saved classes: the checker explains how to add them on `/gpa`.
- A class tagged core with no grade year: counts toward totals, not toward
  10/7, and the page says which classes need a year.
- EADA file missing, renamed or reshaped: the import fails before staging
  and keeps the old data (existing breaker and run log).
- Plan has 500 items (the cap): "Add to my plan" says so in plain words.

## Out of scope
Recruiting profiles, contacting coaches, sharing anything with colleges
(never), rosters and coach names, athletic scholarship money, transfer
rules, international students, the official NCAA approved-course list for
a student's high school (linked, not imported).

## Test plan
- Unit: the EADA parser on a tiny fixture (including a combined sport next
  to its split forms), the sport map, `check()` for each association
  (exactly at the minimum, one short, unfinished classes, missing years).
- pgTAP: `college_sports` readable by anon and not writable; the courses
  check accepts the new keys and rejects unknown values.
- `npm run import -- eada --dry-run` against the real file, then a local
  import.
- By hand on `next start` at 320, 390 and 1280px: `/athletes` signed out and
  signed in, tag classes, then change a grade on `/gpa` and confirm the tags
  survive, add the timeline to the plan twice (no duplicates), filter
  `/colleges?sport=soccer&team=women&level=d2`, and open a college's Sports
  section.
