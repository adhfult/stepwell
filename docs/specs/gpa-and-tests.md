# Spec: GPA and test scores

- Status: approved 2026-10-04

## Goal
Let any student work out their unweighted and weighted GPA, ask "what grade
do I need in these classes to reach a Y GPA", convert SAT and ACT scores
with the official table, and see where their scores fall at each college.
Signed-in students can save their classes, grades and scores. Project 2 of
`pre-launch-roadmap.md`; it builds on the college directory.

## User story
As a high school student, I want to enter my classes and grades and see my
GPA, what I need this term to reach my goal, and how my test scores compare
at colleges, so that I know where I stand and what to aim for.

## Acceptance criteria
### Page `/gpa` ("GPA and test scores")
- [ ] In the main nav after "Colleges"; the nav still fits at 1024px.
- [ ] Works signed out. A signed-out student's work is kept as a draft in
      `localStorage` (this browser only, never sent) so a refresh doesn't
      lose it.
- [ ] Class list: name, type (regular, honors, AP, IB, dual enrollment),
      grade (letter, or blank for not finished yet), credits (default 1,
      0.5 steps). Add and remove rows; at most 80 classes.
- [ ] Shortcut, "I already know my GPA": current unweighted GPA, current
      weighted GPA (each optional) and the credits they cover, then only
      the classes being added.
- [ ] Weights: defaults honors +0.5, AP / IB / dual enrollment +1.0, under
      "My school weights classes differently" where each can be changed
      (0 to 1.0).
- [ ] Unweighted and weighted GPA update live as grades are entered.
- [ ] "What grade do I need?": target GPA and whether it is unweighted or
      weighted; the answer is the lowest letter that reaches the target in
      every unfinished class ("about a B+ in each"), "Not reachable this
      term; the highest you can get is 3.71" above A, or "Any passing grade
      gets you there".
- [ ] Highest reachable GPA (every unfinished class an A) is shown when
      there are unfinished classes.
- [ ] Test scores: SAT total (400-1600, steps of 10) and ACT composite
      (1-36), both optional. The page shows the other test's equivalent
      ("Your 1300 SAT is about a 28 ACT") and links to `/colleges?sat=1300`
      (or `act=`).
- [ ] Source lines: the grade table and weights are "common U.S. high
      school practice; check your school's"; the concordance line reads
      "Source: ACT and College Board concordance tables (2018), the current
      official table. ACT's 2025 composite has no newer table yet."
- [ ] Follows DESIGN.md and AVOID.md; skeleton loader, empty and error
      states; usable by keyboard; no overflow at 320px.

### Saving (signed in)
- [ ] "Save" stores the classes, weights, shortcut values and scores in
      the student's account; the first save asks for consent, like
      eligibility answers.
- [ ] Saved data loads when the student comes back and can be changed and
      saved again; "Remove my grades and scores" deletes all of it.
- [ ] The save is a server action: session checked with `getCurrentUser()`,
      input validated with zod, `user_id` from `auth.uid()`, never the
      form; errors are friendly and log only the database code, never
      grades.
- [ ] After a GPA is worked out, "Use 3.62 for scholarship matching" fills
      `eligibility_profiles.gpa` with the unweighted GPA (scholarship
      minimums are usually on a 4.0 scale), only for a student who has
      opted in to eligibility answers; otherwise it links there.

### Math (`src/lib/gpa/gpa.ts`, pure, shared by browser and server)
- [ ] Points: A+ and A 4.0, A- 3.7, B+ 3.3, B 3.0, B- 2.7, C+ 2.3, C 2.0,
      C- 1.7, D+ 1.3, D 1.0, D- 0.7, F 0.
- [ ] Weighted points = points + the type's bonus; an F gets no bonus.
- [ ] GPA = sum of points x credits / sum of credits over graded classes,
      plus start GPA x start credits from the shortcut on both sides.
- [ ] Needed grade: try each letter from F up in every unfinished class and
      take the first that reaches the target (exact, and an F's missing
      bonus needs no special case).

### Test scores (`src/lib/gpa/concordance.ts`)
- [ ] ACT to SAT (Table A2) and SAT to ACT (Table A1) copied from ACT's
      `ACT-SAT-Concordance-Tables.pdf`, not from memory or third-party
      sites; tests check rows against the PDF.
- [ ] `/colleges` and `/colleges/[unitid]` use the saved scores when the
      URL has none; URL scores still win.
- [ ] `testFit` converts when the student has only the test the college
      doesn't report, and the marker says "(converted from your ACT)" (or
      SAT). Otherwise unchanged: SAT when the college reports it, else ACT.

### Records
- [ ] Decision 0013 records storing grades and scores for students who may
      be 13-17 (extends decision 0006).
- [ ] The Privacy page lists grades and test scores, why, and when they go.

## Data
New table `public.academic_records`, one row per student, owner-only,
modelled on `eligibility_profiles`:
- `user_id uuid primary key default auth.uid()`, cascades on account delete
- `courses jsonb not null default '[]'`: `[{name, type, grade, credits}]`,
  `jsonb_array_length(courses) <= 80`
- `weights jsonb`: `{honors, ap, ib, dual}`; null means the defaults
- `start_unweighted`, `start_weighted numeric(3,2)` (0-5),
  `start_credits numeric(4,1)` (0-80)
- `sat smallint` (400-1600, multiple of 10), `act smallint` (1-36)
- `consent_version smallint not null`, `consented_at`, `updated_at`

RLS: select, insert, update and delete only where `auth.uid() = user_id`;
column-level insert and update grants; no anon access. Deleted with the
account and by a daily job after 12 months without a sign-in (as
`ingest.purge_stale_eligibility`). zod validates the same limits on the
server. Grades and scores are never logged.

## Edge cases and errors
- No classes yet: an empty state that explains what to enter.
- No graded classes and no shortcut: no GPA, only "add a grade to see your
  GPA".
- No unfinished classes: the "what grade do I need" box says to add a class
  without a grade.
- Shortcut credits of 0 with a start GPA: the start GPA is ignored.
- Weighted target with all bonuses 0: same answer as unweighted.
- Save fails: the student's work stays on the page with an error.
- Signed out and presses Save: sign-in link that returns to `/gpa`; the
  local draft survives the round trip.
- A tampered save (101 classes, grade "Z", SAT 1605): rejected by zod and
  by the database checks.

## Out of scope
- A+ as 4.3 and caps on weighted GPA (add when a school needs them).
- Percentage grades, section scores, superscoring.
- Different grades per unfinished class in the solver (the live list
  covers trying a mix).
- Ranking colleges by fit (the directory marker covers it).

## Test plan
- Vitest: `gpa.test.ts` (points, weights, F without bonus, shortcut, needed
  grade including unreachable and any-passing), `concordance.test.ts`
  (rows checked against the PDF), `labels.test.ts` (`testFit` conversion),
  zod schema limits.
- pgTAP: owner can read and write their row; another user and anon can't;
  checks reject 81 classes, SAT 1605, ACT 37; purge removes stale rows.
- By hand on `next start` at 320, 390 and 1280: signed out (draft survives
  refresh), signed in (save, reload, change, remove), college marker from
  saved scores, keyboard only, 0 console and CSP errors.
