# 0013: Saved classes, grades and test scores

- Date: 2026-10-04
- Status: accepted (extends 0006 to a second kind of sensitive data)

## Context
The GPA tool (spec `gpa-and-tests.md`) works for anyone in the browser. The
owner chose to also let signed-in students save their classes, grades and
SAT/ACT, so they're there next time and the college pages can show where a
student's scores fall. Students may be 13 to 17. This is not legal advice.

## Decision
- Saved data lives only in `academic_records`, one row per student, created
  only when the student ticks a consent box and saves. RLS owner-only;
  nothing granted to `anon`; column-level grants; `consent_version` and
  `consented_at` required; the row cascades on account deletion.
- Every rule the form's zod schema has is repeated as a check (80 classes,
  known types and grades, half-step credits, GPA 0 to 5, SAT 400 to 1600 in
  tens, ACT 1 to 36), so direct Data API calls can't skip it.
- Kept separate from `eligibility_profiles`: removing one never removes the
  other. "Use this GPA for scholarship matching" only updates a student who
  already opted in there; it never creates consent.
- Never logged (errors report the database code only), never sent to error
  tracking or an AI model. "Remove my grades and scores" deletes the row.
- Deleted after 12 months without a sign-in (`pg_cron`, like 0006).
- Signed out, the tool keeps a draft in the browser's `localStorage` only;
  it is validated like any input before use and cleared on save.

## Alternatives considered
- Browser only for everyone: least data held, but lost across devices and
  the college pages couldn't use saved scores (the owner chose saving).
- One row per class in its own table: the list is always read and written
  whole by its owner, so a checked jsonb array is simpler with the same
  guarantees.
- Columns on `eligibility_profiles`: ties two consents together.

## Consequences
- The Privacy page describes these fields (done with this decision).
- The legal review in docs/LAUNCH.md now also covers grades of known minors.
- Any future AI use of grades (the roadmap's AI helper) needs its own decision.
