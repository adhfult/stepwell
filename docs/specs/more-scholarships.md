# Spec: More scholarships (local, college and private awards)

- Status: draft

Roadmap project 4, first part (docs/specs/pre-launch-roadmap.md). Internships
and AP data get their own specs later.

## Goal
Add the scholarships students miss most: awards from community foundations
in their county, colleges' own awards, and big private national programs.
They sit beside today's federal and state list and use the same pages.

## User story
As a high school student, I want to see the local, college and private
awards I could apply for, so I don't only find the state and federal ones.

## Decisions taken in brainstorming (2026-10-06)
- All three sponsor kinds at once: `foundation`, `college`, `private`.
- Private national programs are added by hand to the curated JSON list, the
  same way state programs are today. No fetching.
- Foundation and college awards are read from allowlisted pages with
  context.dev (decision 0007), in batches of five states. First batch:
  California, Texas, Florida, New York, Pennsylvania.
- AI-read facts are published only if they pass a grounding check (below);
  anything else is rejected and logged.
- County is saved on the profile, optional, visible only to the student.
  Needs decision 0015 and a privacy policy line.

## Acceptance criteria
### Sources and allowlist
- [ ] `data/award-sites/<state>.json` lists each site: `url`, `sponsor`,
      `kind` (`foundation` or `college`), `unitid` (college only),
      `counties` (5-digit FIPS codes; empty means the whole state), and the
      terms check (`terms_quote`, `terms_url`, `checked_on`). zod-validated.
- [ ] Every site is also listed under "Allowlisted sites" in
      `docs/DATA_SOURCES.md`, quoting the sentence of its terms that allows it.
      The import refuses a site whose check is older than 12 months.
- [ ] The agent researches each state's seed file (foundations and
      colleges, with each site's terms quoted) and the owner approves it in a
      commit before the first import of that state.
- [ ] Before any context.dev call, our polite fetcher checks robots.txt and
      does one plain GET. A disallowed or blocked page (401, 403, 429, a
      challenge page) is skipped and logged. context.dev's bot-bypass is never
      used to get past it (decision 0007).

### Reading pages (import job `local_awards`)
- [ ] One context.dev scrape per site page: `formats: { json: true,
      markdown: true }`, `jsonParams.schema` for a list of awards (title,
      amount text, min, max, deadline text, deadline date, who can apply,
      counties named, link), `maxAgeMs` to reuse cached copies.
- [ ] Each award is validated with the existing scholarship entry schema
      (`src/jobs/sources/official-list.ts`), widened for the new kinds.
- [ ] **Grounding check:** an award is kept only if its title, its amount
      text and its deadline text each appear in the page's markdown (case and
      whitespace ignored). Otherwise it's rejected with the reason logged.
- [ ] **Budget guard:** the job stops before a call that would leave fewer
      than 50 credits (from the API's remaining-credit reply), and the run
      says how many sites are left for next time. Sites read longest ago
      go first.
- [ ] A failed page never removes that site's earlier awards; an award
      missing from two reads in a row is removed.
- [ ] Unit tests on saved pages (fixtures): grounding pass and fail, a
      blocked page, the budget stop, the zod rejects.

### Private national programs
- [ ] `data/scholarships/private.json`, same format, `sponsor_type:
      "private"`, checked by hand with `checked_at`, covered by the existing
      monthly re-check (`npm run scholarships:due`). Start with 20 programs.

### Student side
- [ ] Profile gets an optional county, chosen from the counties of the
      student's state (Census list), with a "Not set" choice. Changing state
      clears it.
- [ ] `/scholarships` matching adds county: county-limited awards show only
      to students in one of their counties; statewide, national and college
      awards show as today. Without a county, county-limited awards are
      hidden and a note says "Add your county to see local awards."
- [ ] Each listing names its kind and, for AI-read ones: "Read from
      [sponsor]'s page on [date]. Check the official page before you apply."
- [ ] A college page lists that college's own awards (by `unitid`).
- [ ] Privacy policy and `docs/SECURITY.md` updated for county; decision
      0015 records why it's stored.

## Data
- `scholarships`: `sponsor_type` adds `foundation`, `college`, `private`;
  new `counties text[]` (FIPS, empty = no county rule), `unitid` (college
  awards, references `institutions`), `read_on date` (AI-read ones). Public
  read as today; written only by the importer role.
- `counties` (new reference table): `fips`, `state`, `name`, from the
  Census Bureau's county list (public domain). Public read.
- `profiles.county`: FIPS text, nullable, must belong to the profile's state.
  Existing RLS: only the student reads or changes their own row.
- Env: `CONTEXT_DEV_API_KEY` (server jobs only; GitHub secret set 2026-10-06).

## Edge cases and errors
- A page lists 100+ awards: keep the first 100, log the rest as skipped.
- A PDF award list: context.dev reads PDFs; same grounding check.
- An award with no deadline in the text: kept as `unknown` deadline only if
  title and amount pass grounding.
- Credits run out mid-batch: the next nightly run continues where it stopped.
- A takedown request: remove the site from the seed file and allowlist the
  same day (decision 0007); the next import removes its awards.

## Cost
JSON extraction is 5 credits a page. The free tier (1,000 credits a month)
reads about 200 pages; a five-state batch is roughly 500 pages, so about
2.5 months per batch for the first read. The $19 Developer plan (7,500
credits) reads a batch in one month. Owner decides; the budget guard works
either way.

## Out of scope
- Internships and AP data (later specs in project 4).
- States beyond the first batch until it's live and checked.
- Any login, CAPTCHA, or bot-protection bypass; any site whose terms forbid it.
- Copying award descriptions beyond the facts (decision 0007, 500 characters).
- Notifications about new local awards.

## Test plan
- Vitest: seed-file schema, grounding check, budget guard, blocked-page
  skip, removal after two misses, county matching rules.
- pgTAP: new columns and checks, county must match profile state, RLS on
  profiles unchanged, `match_scholarships` with and without county.
- By hand: run `npm run import -- local_awards` on one state locally, check
  ten awards against their pages, set a county on the test account and see
  local awards appear on `/scholarships` at 320 and 1280px.
