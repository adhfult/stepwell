# Spec: Saved plan and year-by-year planner

- Status: built (2026-09-29), with the defaults in Result (build step 9 of
  `docs/specs/v1-expansion-draft.md`, whose Sections 1 and 2 describe
  `saved_items` and `plan_items` and are already approved)

## Goal
Turn what a student saves (careers, colleges, scholarships, internships, AP
classes) into one plan laid out by school year, with the real deadlines,
so the path interests → careers → programs → colleges ends in "what do I do
next, and when".

## User story
As a high school student, I want my saved careers, colleges, scholarships
and classes in one year-by-year plan with deadlines, so I know what to do
this year and what comes later.

## Acceptance criteria
- [x] Saving grows beyond careers: colleges, scholarships, internships and
      AP classes get a Save button (signed in) where they're shown.
      `saved_items` gains one nullable column per kind (`unitid`,
      `scholarship_id`, `opportunity_id`, `ap_course_code`) with the
      existing "exactly one" check extended, as Section 2 approved.
- [x] `plan_items` (owner-only RLS, same migration): academic year, term
      (fall, spring, summer, full year), kind (class, task, application),
      title (at most 200), notes (at most 1,000), optional link to one
      saved item, optional due date, status (to do, doing, done), position.
- [x] `/plan` ("My plan" in the Menu, signed in): one section per school
      year from now to the expected graduation year (grade labels from
      `grad_year`: "11th grade (2027 to 2028)"), then "After high school".
      Saved scholarships and internships show their live deadline (read at
      view time, never copied); passed ones say "Closed".
- [x] Add, edit, move (year and term), mark done and delete plan items,
      with Server Actions validated by zod and the session's user.
- [x] Empty state: explains the plan and links to Careers, Scholarships and
      the interest quiz. Phones: each year folds (native `<details>`), the
      current year open.
- [x] Account deletion removes plan items (cascade); the Privacy page lists
      the plan before it ships.
- [x] pgTAP: owner-only access for both tables; unit tests; 320px check.

## Data
`saved_items` (extended) and `plan_items`, both owner-only, deleted with
the account. No sensitive answers; titles and notes are the student's own.

## Edge cases and errors
- No graduation year in the profile: ask for it on `/plan` (links to the
  profile form) and show a single undated list meanwhile.
- A saved listing that disappears (scholarship removed, posting closed and
  removed): the plan item stays, marked "No longer listed", with its title.
- Not signed in: `/plan` explains the feature and links to sign in.

## Out of scope
Suggested plans generated for the student, reminders by email, sharing a
plan with a counselor or parent, printing (a later spec each).

## Test plan
pgTAP for RLS and the "exactly one" check; unit tests for grade labels and
year grouping; by hand at 320px: save from four kinds of pages, build a
plan, move and finish items, delete the account.

## Result
The owner said to proceed, so each open question took its default:
1. Saving: scholarships and colleges (careers already could). Internships,
   AP classes and summer programs were added the same evening (internships
   sit in the school year they close; AP classes in the current year).
2. No starter tasks; the plan starts empty with links to get going.
3. Everyone gets the same year view; with no graduation year (adult
   learners, or not filled in) years run from now, and `/plan` asks for the
   year where it applies.
4. No notes in v1: a 13-year-old's free text is a privacy risk the plan
   doesn't need. Titles are capped at 200 and the form says not to include
   private details.

Other differences from the criteria above:
- Status is done or not done (no "doing"), and items sort by term and due
  date instead of a stored position.
- Plan items don't link to saved items. Saved scholarships sit in the year
  of their next deadline and saved colleges in senior year, read live.
- Saved scholarships and colleges have no foreign key (the merges delete
  rows) and keep a title copy, so a removed listing shows "No longer
  listed" by name. pgTAP checks the merge still runs.
- "My plan" sits beside Account in the header from 640px; on phones the
  header has no room, so Account links to it.
- Security review: per-student caps (1,000 saved items, 500 plan steps)
  by a trigger in `20260929231617_user_row_caps.sql`, since saved ids have
  no foreign key and a script could otherwise fill the tables.
