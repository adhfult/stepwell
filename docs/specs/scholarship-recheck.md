# Spec: Keeping the scholarship list current

- Status: built (2026-09-29)

## Goal
Make sure no scholarship listing quietly goes out of date: every entry is
re-checked against its official page at least once a year, and dated
deadlines are refreshed soon after they pass.

## User story
As a student, I want the deadlines and rules I see to be this year's, so I
don't miss or chase the wrong date.

## Already true
- Entries not checked in 12 months hide their deadline and say "Check the
  official page for this year's details" (`deadlineText`).
- The research rules are in `data/scholarships/README.md`.

## Acceptance criteria
- [x] `npm run scholarships:due` lists, by state, the entries that need a
      look: `checked_at` older than 11 months, or a `date` deadline that
      has passed (it will usually come back next year). No network use.
- [x] A monthly GitHub Actions job runs the same check and, when anything
      is due, fails with the list in its summary (GitHub emails the owner),
      so nothing depends on remembering.
- [x] Unit tests for the "due" rule.
- [x] README gains a short "How to re-check" section: run the list, re-read
      each page, update facts and `checked_at`, validate, import, commit.

## Data
None stored; reads `data/scholarships/*.json`.

## Edge cases and errors
- A program that ended: remove the entry (the import removes the listing).
- An official page that moved: update `url`; if no official page remains,
  remove the entry.

## Out of scope
Automatic scraping of the official pages (each state's page is different,
and decision 0007 prefers facts checked by a person), private scholarships.

## Test plan
Unit tests on fixed dates; one manual run of the workflow.

## Result
The owner said to proceed, so the defaults were taken: a failing monthly
job (`.github/workflows/scholarship-recheck.yml`, no extra permissions)
rather than an opened issue, and the owner re-checks, optionally with an
agent session that follows the README rules. The script is
`src/jobs/scholarships-due.ts`; nothing is due on 2026-09-29.
