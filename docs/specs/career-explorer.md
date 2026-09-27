# Spec: Career Explorer (first data feature)

- Status: draft (write the O*NET import first; approve before building)

## Goal
Let anyone search careers and read a clear page about each one, built from
cached O*NET data.

## User story
As a student, I want to look up a career and quickly understand what the work
is, what it takes, and what it pays.

## Acceptance criteria
- [ ] Import job loads occupations and details from O*NET into `occupations`
      and `occupation_details` (reference tables, public read, RLS on).
- [ ] `/careers` page: search box with results as you type (debounced);
      works without an account.
- [ ] `/careers/[soc_code]` page: title, plain-language description, top tasks,
      top skills, typical education, related careers, with an O*NET source line.
- [ ] Signed-in users can save a career (writes to `saved_items`, owner-only).
- [ ] No page calls O*NET directly; all data comes from our tables.
- [ ] Loading, empty ("no careers match"), and error states; phone-width layout.
- [ ] `npm run check` passes; tests cover search query building and data mapping.

## Data
See `docs/ARCHITECTURE.md` (occupations, occupation_details, saved_items).

## Out of scope
Pay/outlook from BLS (later), programs/colleges (next spec), interest quiz (next spec).

## Test plan
Run the import against a small sample first. Search "nurse", "software",
"electrician": each should return sensible results in the top 3.
