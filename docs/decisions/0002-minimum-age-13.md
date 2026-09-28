# 0002: Minimum age 13, minimal data

- Status: accepted; how age is confirmed is replaced by 0005

## Context
The audience includes high school students. U.S. law (COPPA) imposes strict
parental-consent requirements for collecting personal data from children
under 13, and student-privacy laws restrict how student data may be used.

## Decision
Require users to confirm they are 13 or older. Store only a confirmation flag,
not a birthdate. Collect the minimum data per feature. No ads, tracking, or
data sharing. This is not legal advice; revisit before a public launch or if
the app is ever offered to schools.

## Consequences
Some younger students can't use it. Features must be designed to work with
little personal data. Offering the app to schools later would need a new review.
