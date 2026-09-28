# 0005: Neutral age screen at sign-up

- Date: 2026-09-27
- Status: accepted (replaces how 0002 confirms age; the rest of 0002 stands)

## Context
Decision 0002 sets the minimum age at 13 and stores only a confirmation flag.
The accounts spec first used an "I am 13 or older" checkbox, which tells a
younger child exactly what to tick. The FTC's COPPA FAQ says to "ask age
information in a neutral manner at the point at which you invite visitors to
provide personal information or to create a user ID", and that the entry
point should not default to an age of 13 or over. This is not legal advice.

## Decision
- Sign-up asks "What month and year were you born?" without mentioning an
  age limit. Both menus start empty.
- The server works out whether the person is 13 or older. Someone born in the
  current month 13 years ago counts as under 13 (no day is asked, so Stepwell
  errs on the safe side).
- The month and year are never stored or logged. Only `age_confirmed = true`
  is saved, set by the sign-up trigger, which refuses any sign-up without it.
- Under 13 sees a kind message that doesn't explain how to get in, and a
  session-only cookie (no personal data) keeps showing it on retry.

## Alternatives considered
- The checkbox: simplest, but not neutral.
- Storing the full birth date: more precise, but collects more about minors
  than any feature needs (decision 0002).
- Asking the full date without storing it: more precise near a 13th birthday,
  but one more field; month and year with the safe-side rule is enough.

## Consequences
- A few 13-year-olds born this month must wait until next month to sign up.
- Age is still self-reported; a determined child can lie. The screen is a
  good-faith check, not proof.
- Revisit before public launch and before offering Stepwell to schools, as
  decision 0002 already requires.
