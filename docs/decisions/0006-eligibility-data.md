# 0006: Optional scholarship eligibility answers

- Date: 2026-09-28
- Status: accepted (replaces the minimum-data parts of 0002 for eligibility
  answers only; the rest of 0002 and 0005 stands)

## Context
Scholarships often depend on things like GPA, citizenship, heritage,
disability or family income. Decision 0002 says to collect the minimum data
per feature. The owner chose "save everything for best matching", so
Stepwell needs a clear rule for holding sensitive answers from users who may
be 13 to 17. This is not legal advice.

## Decision
- Answers live only in `eligibility_profiles`, one row per student, created
  only when the student opts in. RLS owner-only; nothing granted to `anon`;
  a check constraint on every answer; `consent_version` and `consented_at`
  required; the row cascades on account deletion.
- Two steps of opt-in. Step one: GPA, intended fields, first-generation,
  citizenship status. A separate second choice unlocks heritage, gender,
  religion, disability, military family and income band. Every question says
  why it's asked and offers "Prefer not to say".
- Matching runs inside the database (`security invoker` function). Pages get
  match levels and reasons, never anyone else's answers.
- Answers are never logged, never sent to error tracking and never sent to an
  AI model. "Remove my answers" deletes the row.
- Deleted after 12 months without a sign-in (`pg_cron`).
- A newer consent text version asks the student again before matching.

## Alternatives considered
- Ask nothing and show "check eligibility yourself": safest, but the matches
  would be much weaker.
- Keep answers in the browser only: lost across devices, and matching would
  need every listing sent to the browser.

## Consequences
- The Privacy page must describe these answers before any are collected.
- A legal review of state laws on sensitive data of known minors is needed
  before public launch (docs/LAUNCH.md).
- Any future AI use of these answers needs its own decision.
