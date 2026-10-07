# Official scholarship list

One file per state (`<code>.json`) plus `federal.json` and `private.json`
(private national programs, ids `pv-...`), in the format in
`docs/specs/scholarships.md` ("Listing format"). Loaded by the
`official_list` import (`src/jobs/sources/official-list.ts`), which rejects
anything off-format.

## Rules for adding or re-checking entries
- Official government pages only (state agencies, public university
  systems they point to). `private.json`: the sponsor's own program page; no
  loans, fees, lottery-style giveaways, lead-generation sites, or programs
  only for one employer's or group's members. Unknown facts are `null`, never guessed; every
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

## How to re-check
Every entry older than 12 months shows "Check the official page for this
year's details" instead of its deadline. On the 1st of each month the
"Scholarship re-check" workflow fails, and GitHub emails the owner, when
anything is due: checked more than 11 months ago, or a dated deadline that
has passed (it usually comes back next year).

1. `npm run scholarships:due` lists what's due, by state.
2. Re-read each official page, update the facts and `checked_at` by the
   rules above. Remove a program that ended; update `url` if the page moved.
3. `npm run import -- official_list --dry-run` validates the files, then
   `npm run import -- official_list` loads them.
4. Commit. The next monthly run passes once nothing is due.
