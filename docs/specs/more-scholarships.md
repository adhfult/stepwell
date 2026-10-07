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
- **Reading is free, always (owner, non-negotiable).** No paid scraping or
  AI service. Pages are fetched by our own polite fetcher and read by the
  owner's local model (`LOCAL_AI_URL`, `LOCAL_AI_MODEL`; Ollama) or, when it's
  off, by the coding agent in its session. context.dev is dropped.
- Read awards land in the curated JSON files; the owner reviews the `git
  diff` and commits, and the existing import publishes them. No new import
  job, no CI secret, no cloud AI.
- Batches of five states. First batch: California, Texas, Florida, New York,
  Pennsylvania.
- County is saved on the profile, optional, visible only to the student.
  Needs decision 0015 and a privacy policy line.
- Sites stay subject to decision 0007 (terms and robots.txt). AcademicWorks
  pages are out until Blackbaud or the college gives written permission:
  Blackbaud's terms forbid "any robot, spider, scraper" (checked 2026-10-06).

## Acceptance criteria
### Site lists
- [ ] `data/award-sites/<state>.json` lists each site: `url`, `sponsor`,
      `kind` (`foundation` or `college`), `unitid` (college only),
      `counties` (5-digit FIPS codes; empty means the whole state), the terms
      check (`terms_quote`, `terms_url`, `checked_on`) and the last read's
      `fingerprint`. zod-validated.
- [ ] Every site is also under "Allowlisted sites" in `docs/DATA_SOURCES.md`
      with its terms sentence quoted. The script refuses a site whose check
      is older than 12 months.
- [ ] The agent researches each state's list (foundations and colleges,
      terms quoted) and the owner approves it in a commit before its first read.

### The reader: `npm run awards:read -- <state>` (owner's PC)
- [ ] Fetches each site page with the polite fetcher (robots.txt, StepwellBot
      User-Agent, one request per 5 seconds per host). A disallowed or blocked
      page (401, 403, 429, a challenge page) is skipped and listed at the end.
- [ ] Turns the HTML into plain text and fingerprints it (SHA-256). A page
      whose fingerprint matches the last read is skipped.
- [ ] Sends a changed page's text to the local model with a short prompt and
      a JSON schema (title, amount text, min, max, deadline text, deadline
      date, who can apply, counties named, link). Long pages go in chunks
      that fit the model's context.
- [ ] Each award is checked with zod and the **grounding check**: its title,
      amount text and deadline text each appear in the page text (case and
      whitespace ignored). Failures are listed with the reason, never written.
- [ ] Passing awards are merged into `data/scholarships/<state>.json` by id,
      with `sponsor_type` `foundation` or `college`, `read_on` (date) and the
      site's `counties` / `unitid`. An award missing from two reads in a row
      is removed; a failed or blocked page never removes its awards.
- [ ] `--check <state>` runs zod and the grounding check on that file's read
      awards against freshly fetched pages, without the model. The agent uses
      it after writing entries by hand when Ollama is off.
- [ ] Without `LOCAL_AI_URL` reachable, the script says so and stops (no
      fallback to any paid service).
- [ ] Unit tests on saved pages (fixtures): HTML to text, fingerprint skip,
      grounding pass and fail, blocked page, merge and two-miss removal, a
      malformed model reply.

### Skill: `.claude/skills/read-awards/SKILL.md`
- [ ] When to use, how to run the reader for a state, how to review the
      diff, and the fallback: the agent reads the page text itself, writes
      entries in the same format, then runs `--check`. Also readable by
      Codex and Antigravity (plain markdown, no Claude-only tools required).

### Private national programs
- [ ] `data/scholarships/private.json` with ids `pv-...` (one-line loader
      rule like `federal.json` → `us`), `sponsor_type: "private"`, checked by
      hand with `checked_at`, covered by `npm run scholarships:due`. Start
      with 20 programs whose official pages state the rules.

### Student side
- [ ] Profile gets an optional county, from the Census list for the
      student's state, with a "Not set" choice. Changing state clears it.
- [ ] `/scholarships` matching adds county: county-limited awards show only
      to students in one of their counties; statewide, national and college
      awards show as today. Without a county, county-limited awards are
      hidden and a note says "Add your county to see local awards."
- [ ] Read awards say: "Read from [sponsor]'s page on [date]. Check the
      official page before you apply."
- [ ] A college page lists that college's own awards (by `unitid`).
- [ ] Privacy policy and `docs/SECURITY.md` updated for county; decision
      0015 records why it's stored.

## Data
- `scholarships`: `sponsor_type` adds `foundation`, `college`, `private`; new
  `counties text[]` (FIPS, empty = no county rule), `unitid` (college awards,
  references `institutions`), `read_on date`. Public read as today; written
  only by the importer role.
- `counties` (new reference table): `fips`, `state`, `name`, from the Census
  Bureau's county list (public domain). Public read.
- `profiles.county`: FIPS text, nullable, must belong to the profile's state.
  Existing RLS: only the student reads or changes their own row.
- No new secrets. `CONTEXT_DEV_API_KEY` is unused and can be deleted.

## Edge cases and errors
- A page lists 100+ awards: keep the first 100, list the rest as skipped.
- A PDF award list: skipped and listed for the agent to read by hand.
- An award with no deadline in the text: kept with an `unknown` deadline
  only if title and amount pass grounding.
- The local model is slow (no graphics card): the reader prints progress and
  can be stopped and re-run; fingerprints make re-runs skip finished pages.
- A takedown request: remove the site and its awards the same day (0007).

## Out of scope
- Internships and AP data (later specs in project 4).
- States beyond the first batch until it's live and checked.
- Any paid service; any login, CAPTCHA or bot-protection bypass; any site
  whose terms forbid reading.
- Copying award descriptions beyond the facts (decision 0007, 500 characters).
- Running the reader in GitHub Actions (no local model there).

## Test plan
- Vitest: site-list schema, HTML to text, fingerprint, grounding, merge and
  removal, model-reply validation, county matching rules.
- pgTAP: new columns and checks, county must match profile state, RLS on
  profiles unchanged, `match_scholarships` with and without county.
- By hand: run the reader on one state with Ollama, check ten awards against
  their pages, run `--check`; set a county on the test account and see local
  awards on `/scholarships` at 320 and 1280px.
