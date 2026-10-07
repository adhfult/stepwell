# Spec: More scholarships (local directory and private awards)

- Status: approved (2026-10-06)

Roadmap project 4, first part (docs/specs/pre-launch-roadmap.md). Internships
and AP data get their own specs later.

## Goal
Help students find the scholarships they miss most: their county's
community foundations, colleges' own scholarship pages, and big private
national programs.

## User story
As a high school student, I want to know which local foundations and
colleges give scholarships I could apply for, and the big national ones, so
I don't only find state and federal aid.

## Decisions taken in brainstorming (2026-10-06)
- **Link, don't copy.** Foundation and college awards are a directory of
  sources: name, who it serves, and a link to its scholarship page. Stepwell
  doesn't read or store their individual awards. Owner chose this over
  reading pages (paid services ruled out; the local model took 9 minutes a
  page, measured 2026-10-06). Reading full details can come later per state.
- Linking isn't reading a site, so decision 0007's terms check doesn't apply
  to directory entries; AcademicWorks pages can be listed.
- Private national programs get full details, added by hand.
- Batches of five states. First batch: California, Texas, Florida, New York,
  Pennsylvania.
- County is saved on the profile, optional, visible only to the student.
  Needs decision 0015 and a privacy policy line.
- No paid services, no new secrets. `CONTEXT_DEV_API_KEY` is unused and can
  be deleted.

## Acceptance criteria
### Directory files
- [ ] `data/award-sites/<state>.json`, one entry per source: `id`, `name`,
      `kind` (`foundation` or `college`), `unitid` (college only), `counties`
      (5-digit FIPS codes; empty means the whole state), `url` (the
      scholarship page, https), `serves` (short plain text, at most 140
      characters, e.g. "Students from Orange County high schools"),
      `checked_on`. zod-validated in a unit test over every file.
- [ ] The agent researches each state's file (community foundations that
      list scholarships, plus colleges with a public scholarship page) and the
      owner approves it in a commit. A college entry's `unitid` must exist in
      the Scorecard data.
- [ ] `data/counties.json`: every county from the Census Bureau's county
      list (public domain): FIPS, state, name.

### Link check
- [ ] `npm run award-sites:check` fetches each `url` once with the polite
      fetcher and lists any that don't answer 200 (or redirect to a 200).
      Pages whose robots.txt blocks the check are listed as "not checked".
- [ ] The monthly `scholarship-recheck.yml` job runs it too, so a dead link
      fails the job and GitHub emails the owner.

### Private national programs
- [ ] `data/scholarships/private.json` with ids `pv-...` (one-line loader rule
      like `federal.json` → `us`), `sponsor_type: "private"`, checked by hand
      with `checked_at`, covered by `npm run scholarships:due`. Start with 20
      programs whose official pages state the rules. Migration widens the
      `sponsor_type` check.

### Student side
- [ ] Profile gets an optional county, from the counties of the student's
      state, with a "Not set" choice. Changing state clears it. The server
      checks the county belongs to the state.
- [ ] `/scholarships` gets a "Local scholarships" section for the student's
      state: foundations serving their county first, then statewide ones.
      Without a county: statewide ones only, and "Add your county in your
      profile to see local foundations." A state with no file yet: "We don't
      list local foundations for [state] yet."
- [ ] Each entry: name (linked), what it serves, and "Scholarships listed on
      their site. Checked [date]."
- [ ] A college page links to "This college's scholarships" when its file
      has an entry for that `unitid`.
- [ ] Privacy policy and `docs/SECURITY.md` updated for county; decision 0015
      records why it's stored.

## Data
- `profiles.county`: text, nullable, 5-digit FIPS (check constraint on the
  format). Existing RLS: only the student reads or changes their own row.
- `scholarships.sponsor_type` allows `private`.
- Directory and county lists are JSON files in the repo, read by server
  code. No new tables.

## Edge cases and errors
- A county with no foundation listed: show statewide ones and say so.
- A foundation serving several counties: one entry, all its counties.
- A link that moved: the monthly check flags it; the agent updates `url`.
- A takedown or "please don't link" request: remove the entry the same day.

## Out of scope
- Reading or storing individual local or college awards (possible later per
  state, under decision 0007).
- Internships and AP data (later specs in project 4).
- States beyond the first batch until it's live.
- Notifications about new local awards.

## Test plan
- Vitest: every directory file and `counties.json` pass their schemas; ids
  unique; college `unitid`s known; local-section ordering (county, then
  statewide); county belongs to state.
- pgTAP: `profiles.county` format check, RLS unchanged; `private` accepted.
- By hand: set a county on the test account, see the local section on
  `/scholarships` at 320 and 1280px; a college page shows its link;
  `npm run award-sites:check` on one state.
