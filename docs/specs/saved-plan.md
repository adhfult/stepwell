# Spec: Saved plan and year-by-year planner

- Status: draft (for the owner's review; build step 9 of
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
- [ ] Saving grows beyond careers: colleges, scholarships, internships and
      AP classes get a Save button (signed in) where they're shown.
      `saved_items` gains one nullable column per kind (`unitid`,
      `scholarship_id`, `opportunity_id`, `ap_course_code`) with the
      existing "exactly one" check extended, as Section 2 approved.
- [ ] `plan_items` (owner-only RLS, same migration): academic year, term
      (fall, spring, summer, full year), kind (class, task, application),
      title (at most 200), notes (at most 1,000), optional link to one
      saved item, optional due date, status (to do, doing, done), position.
- [ ] `/plan` ("My plan" in the Menu, signed in): one section per school
      year from now to the expected graduation year (grade labels from
      `grad_year`: "11th grade (2027 to 2028)"), then "After high school".
      Saved scholarships and internships show their live deadline (read at
      view time, never copied); passed ones say "Closed".
- [ ] Add, edit, move (year and term), mark done and delete plan items,
      with Server Actions validated by zod and the session's user.
- [ ] Empty state: explains the plan and links to Careers, Scholarships and
      the interest quiz. Phones: each year folds (native `<details>`), the
      current year open.
- [ ] Account deletion removes plan items (cascade); the Privacy page lists
      the plan before it ships.
- [ ] pgTAP: owner-only access for both tables; unit tests; 320px check.

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

## Open questions (the owner's decisions)
1. Which kinds can be saved in this step: all five above, or start with
   scholarships and colleges?
2. Starter tasks: add a few standard dated tasks automatically (for
   example "File the FAFSA, from Oct 1 of senior year"), or leave the plan
   empty until the student adds things?
3. Middle schoolers and adult learners: same year view, or a plain list?
4. Plan notes are free text a 13-year-old could fill with personal details:
   keep notes, cap them shorter, or leave notes out of v1?
