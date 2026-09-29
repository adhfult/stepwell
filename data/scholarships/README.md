# Official scholarship list

One file per state (`<code>.json`) plus `federal.json`, in the format in
`docs/specs/scholarships.md` ("Listing format"). Loaded by the
`official_list` import (`src/jobs/sources/official-list.ts`), which rejects
anything off-format.

## Rules for adding or re-checking entries
- Official government pages only (state agencies, public university
  systems they point to). Unknown facts are `null`, never guessed; every
  fact should be on the linked page or a page it links to.
- 2 to 6 programs a state: the main ones a student can apply to.
- Leave out loans, conditional or forgivable loans (repaid if you don't
  finish, teach, or stay in the state), work-study, tax credits, 529 plans,
  employee-only or Guard-only programs, programs "under review" or closed
  to new students, and single-event programs.
- Deadlines: `date` only when the page prints a specific date that hasn't
  passed; a date the page says repeats each year is `usually` with MM-DD;
  otherwise `rolling` or `unknown`.
- `min_gpa` only for a hard rule. When a test score or class rank can
  replace the GPA, write it in `rules.other` instead.
- Lengths: `rules.other` at most 420 characters, `description` at most 500,
  `award.text` at most 120. No em or en dashes.
- `checked_at` is the day you checked the page.

## Yearly re-check
Every entry older than 12 months shows "Check the official page for this
year's details" instead of its deadline. Re-check each state's page, update
facts and `checked_at`, then run `npm run import -- official_list`.
