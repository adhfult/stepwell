# Spec: College athlete path

- Status: approved 2026-10-04

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
- [x] Monthly import of the U.S. Dept. of Education's Equity in Athletics
      Data Analysis (EADA): newest year from
      `ope.ed.gov/athletics/api/dataFiles/fileList`, skipped when the year
      matches the last import. Fills `colleges.athletics_code` (EADA
      classification) and `college_sports` (college, sport, men's and
      women's participant counts; null means no team).
- [x] Combined EADA sports are split ("Track and Field and Cross Country"
      into track and cross country, "Swimming and Diving" into swimming and
      diving), one row per college and sport, keeping the larger count when
      both forms are reported.
- [x] `/colleges` gains Sport, Team (men's or women's) and Level (NCAA I,
      II, III, NAIA, junior college, other) filters; bad values are ignored.
- [x] A college page shows a Sports section after programs: its level and
      its men's and women's teams with roster sizes ("Women's soccer, 28
      athletes"), and the line "Source: U.S. Dept. of Education, Equity in
      Athletics Data Analysis (EADA), 2024-25". Hidden when the college is
      not in EADA.
- [x] `/athletes` (in the Menu): pick a level (`?level=`), read Stepwell's
      summary of its rules with links to the official pages, check your
      classes, see the timeline by grade, and find teams (sport and team
      selects linking to the filtered directory).
- [x] Signed in, each saved class from `/gpa` can be tagged with a core
      category (English; math; natural or physical science; extra English,
      math or science; social science; extra core) and the grade it was
      taken in (9 to 12). Tags are saved in the same record as the classes,
      and saving on `/gpa` keeps them.
- [x] The checker scores only rules confirmed on an official page:
      NCAA I (16 core courses by category, 10 of them with 7 in English,
      math or science before senior year, core GPA 2.3), NCAA II (16 core by
      category, core GPA 2.2), NAIA (2.3 GPA, or two of: 2.0 GPA, top half
      of class, ACT 18 or SAT 970; class rank is a question on the page, not
      saved) and junior colleges once their rules are confirmed on njcaa.org
      or cccaasports.org. NCAA III shows that each college sets its own
      standards. Any rule we couldn't confirm is shown as text with the
      official link, never as a score. (Built 2026-10-04: the confirmed
      junior college rules are a diploma or equivalency exam (NJCAA) and
      admission (CCCAA), which classes can't show, so juco is text only.)
- [x] Every result shows what is missing (for example "1 more math") and
      says "Estimate, not an official certification" with a link to the body
      that decides (NCAA Eligibility Center, NAIA Eligibility Center).
- [x] Unfinished classes (no grade yet) count toward planned courses but
      not toward the GPA or the 10/7 rule.
- [x] The timeline by grade (9th to 12th) uses only confirmed steps; dates we
      couldn't confirm say "check your sport's recruiting calendar" with a
      link. Each rule and step records its source URL and the date checked.
- [x] "Add to my plan" adds the timeline's steps to `/plan` as tasks in the
      right school year, once: steps already there are skipped. With no
      graduation year in the profile it asks for one, as `/plan` does.
- [x] Signed out, `/athletes` explains everything and links to `/gpa` and
      sign in for the checker.
- [x] EADA appears on About the data and in `docs/DATA_SOURCES.md`.

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
- College in EADA but not in Scorecard: skipped by the merge, which keeps
  only colleges in Scorecard. College in Scorecard but not EADA: no Sports section; excluded when a
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

## Rules checked (2026-10-04)

Checked on official pages on 2026-10-04. `CBSA` is the NCAA 2026-27 Guide for the College-Bound Student-Athlete,
http://fs.ncaa.org/Docs/eligibility_center/Student_Resources/CBSA.pdf.

### NCAA core GPA

- Letter points: "QUALITY POINTS A = 4 points B = 3 points C = 2 points D = 1 point" (CBSA).
- Plus and minus ignored: "The Eligibility Center does not use plus or minus grades when calculating your core-course
  GPA. For example, grades of B+, B and B- are each worth 3 quality points." (CBSA)
- Weighting only if the school's scale is approved: "weighted grading scales must be submitted by the high school and
  approved by the Eligibility Center" (CBSA); "A maximum of 1.00 additional quality point may be assigned." and "Weight
  cannot be applied to dual-enrollment courses." (https://www.ncaa.org/eligibility-center/resources-for-high-schools/).
  The checker leaves weighting out, so its estimate can only be lower than the official one.
- Units: "1 semester unit = 0.50 unit" (CBSA).

### Division I and II

- DI areas: English 4, math (Algebra I or higher) 3, science 2, more English/math/science 1, social science 2, more
  core 4 (https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-i/).
- DI 10/7: "Ten of your core courses (7 in English, math, or science) must be completed before start of the seventh
  semester (senior year)." (division-i page)
- DI GPA: "Earn a minimum 2.3 core-course GPA." (CBSA)
- No tests: "In January 2023, NCAA Divisions I and II adopted legislation to remove standardized test scores from
  initial-eligibility requirements." (CBSA)
- DII areas: English 3, math 2, science 2, more English/math/science 3, social science 2, more core 4
  (https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-ii/); "Earn a minimum 2.2
  core-course GPA." (CBSA). No 10/7 or other timing rule is listed for DII.
- NOT CONFIRMED: a lab requirement for science. Both pages say only "Science 2 years", so the checker doesn't ask.

### NAIA

- "Must graduate with a 2.3+ GPA or meet two of the three following requirements": ACT 18 or SAT 970, a 2.0 GPA, top
  half of the class (https://www.naia.org/wp-content/uploads/2026/05/naia_guide_college_bound_student.pdf, May 2026;
  bylaw https://copforum.naia.org/21-b-10-initial-eligibility/).
- "based on your high school grades (no core courses necessary!)"
  (https://www.naia.org/student-athletes/prospective/high-school-students/).
- NOT CONFIRMED: no page names a graduating class; the May 2026 guide is taken as current for 2027. NAIA early
  determination thresholds differ between the guide and the bylaw page, so the tool doesn't show them.

### Junior and community colleges

- NJCAA: "To be certified for participation on an NJCAA Eligibility Roster, a student-athlete must provide proof of high
  school graduation", by final transcript or "State-recognized equivalency exam test results and diploma" (NJCAA
  Handbook and Bylaws 2026-27, Art. V §2.B.1,
  https://media.ardorsportshub.com/files/404933495157163011/6b815aea7cf842719e5deeefd7dc9310-NJCAA-Handbook---Bylaws---2026-27-9-9-26.pdf).
- CCCAA: "A student who has been admitted to attend any California community college shall be eligible to participate
  in the college athletic program", with 12 units in the season (bylaw 1.3.1)
  (https://www.cccaasports.org/Constitution/2026-27/2026-27_Constitution.pdf).

### Timeline

- "Register with the Eligibility Center at eligibilitycenter.org before ninth grade"; a Profile Page is for students not
  yet recruited; "Transition your account to an Academic and Athletics Certification account once you are recruited by
  a Division I or II school." (CBSA)
- "Before a Division I or II official visit: » You must register with the Eligibility Center." (CBSA) Division III is
  not included.
- "Ask your high school counselor to upload your official high school transcript with proof of graduation after you
  graduate." (CBSA)
- NAIA: "Every student interested in playing sports at NAIA colleges for the first time needs to register online with
  the NAIA Eligibility Center and receive an eligible determination." (NAIA guide)
- Commitment: "Official Commitment: When you sign an athletics aid agreement for a scholarship with a Division I or II
  school." (CBSA); "The National Letter of Intent (NLI) website is no longer available as of May 1, 2025"
  (http://www.nationalletter.org/). No ncaa.org page says "replaced", so the tool says "athletics aid agreement" and
  doesn't mention the NLI.
