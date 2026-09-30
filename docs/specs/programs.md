# Spec: Summer programs and research (official list)

- Status: built (2026-09-29). The owner asked for all the remaining work
  "in one go", so the defaults below were taken without a separate review.

## Goal
Show students free or paid summer programs, internships and research
programs run by federal agencies, national labs, state governments and
public universities, beyond the USAJOBS postings on `/internships`
(build step 8 of `docs/specs/v1-expansion-draft.md`: "allowlisted internship
and summer-program sites").

## User story
As a high school or college student, I want to find summer programs and
research internships I can afford and trust, near me or anywhere, so I can
try a field before choosing it.

## Acceptance criteria
- [x] `data/programs/<state>.json` and `federal.json`: a curated list, same
      approach as scholarships (official pages only; facts copied by a
      person or research agent, spot-checked; unknown facts are null).
- [x] Vetting (users may be 13): run by a federal agency or national lab,
      a state agency or Governor's School, or a public university, on its
      official site; free to attend or paying the student (no tuition or
      fees); running for 2026 or 2027.
- [x] Source `official_programs` (manual, daily like `official_list`),
      table `student_programs` (public read, replaced by `ingest.merge_student_programs()`; `programs` was taken by College Scorecard).
- [x] `/programs` ("Programs" in the Menu): filters for state (the
      student's by default; national programs always included) and school
      stage; paid or free shown in words; deadline rules as scholarships;
      "Apply on the official site (domain)"; 15 first, then "Show all".
- [x] Save to the plan (signed in), like internships: no foreign key, a
      title copy, "No longer listed" if it leaves the list.
- [x] The yearly re-check (`npm run scholarships:due`) covers these files too.
- [x] pgTAP for RLS and the merge; unit tests for the parser; 320px check.

## Data
`student_programs`: id, title, sponsor, sponsor type, kind (summer program,
internship, research), url, stages, states (empty = national), remote,
paid, pay text, deadline (date, usually, rolling, unknown), who can apply,
description, checked date. Public read. Nothing about students.

## Edge cases and errors
- A national program shows for every state.
- Unpaid but free programs say "Free, unpaid"; paid ones show the pay text
  when the page gives it, else "Paid".

## Out of scope
Private companies, nonprofits that charge tuition, city programs beyond one
per state, scraping program sites (decision 0007 prefers facts a person
checked).

## Result
- 111 programs from three research agents (28 federal, 83 in 45 states and
  DC; none found that pass the rules in MO, NH, TN, VT, WY). Left out, with
  reasons in the agents' notes: Governor's Schools that charge fees (NC,
  SC, OK, VA, MO, KY), programs whose pages didn't confirm pay or cost, and
  pages that blocked checking (Library of Congress, NH, Alaska).
- Spot-check of 20 random entries against their official pages: 96 of 100
  facts matched; 4 wording fixes (RI partner count, KY school deadline
  note, CA age rule, IL tuition wording). No pay, cost or deadline changed.
- Tried at 390px signed in: filters, save, and the saved program on
  `/plan` with its live deadline.
