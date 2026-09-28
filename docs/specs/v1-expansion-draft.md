# Draft: v1 expansion (academics, scholarships, opportunities)

- Status: draft, not approved
- Started: 2026-09-27
- Design stage reached: Sections 1 and 2 approved in chat (2026-09-27).
  Section 3 drafted, awaiting review. Section 4 not drafted yet.
- Nothing in this file changes other docs until it is approved. Where it
  disagrees with PRODUCT.md, ARCHITECTURE.md, DATA_SOURCES.md, SECURITY.md or
  decision 0002, this draft is the proposal and those files are still current.

## Why this draft exists
Stepwell should also help students plan academics and find scholarships
(AP classes, internships, summer and pre-college programs), with some web
scraping. This reverses `PRODUCT.md` "Not doing: Scholarships". The same pass
resolves the unclear or contradictory items found when the docs were first
reviewed.

## Decisions made so far (answers given in chat)
| Question | Answer |
|---|---|
| What should students walk away with? | Both: suggestions on career and program pages first, then a personal year-by-year plan. |
| When does it land? | In v1, everything, scraping included. (Trade-off accepted: v1 roughly doubles before the first 10 students try it.) |
| Which sites may be scraped? | Largest legal set: CareerOneStop's API as the base, plus only sites whose terms allow scraping and whose robots.txt permits it, each recorded in docs. Sites that forbid scraping are skipped. |
| How much eligibility data is kept? | Save everything for best matching, with safeguards (see "Eligibility data safeguards"). |
| Pipeline approach | A: one shared pipeline with one small adapter per source. |
| Design direction | Water and Stone, mixed with Wayfinding (see "Design direction"). |

## Research findings (checked 2026-09-27)
| Finding | Source | What it changes |
|---|---|---|
| O*NET Web Services is API version 2.0; "All requests must be accompanied by an X-API-Key header." | services.onetcenter.org/reference | `ONET_USERNAME` / `ONET_PASSWORD` in the docs are out of date; replace with `ONET_API_KEY`. |
| O*NET Web Services is licensed CC BY 4.0. | services.onetcenter.org | Attribution required; storing is allowed. |
| The O*NET database (release 30.0) is a downloadable CC BY file set including Alternate Titles, Related Occupations, knowledge ratings and interest scores. | onetcenter.org dictionary 30.0 | Most career data comes from one bulk download per release instead of about 1,000 API calls. |
| My Next Move "Job Outlook" includes low, median and high salary for all occupations, plus an outlook rating. | services.onetcenter.org "What's New" (API 1.8) and v2 reference | Pay and outlook can be in v1. Resolves the pay contradiction. |
| CareerOneStop: "Data available through CareerOneStop APIs are open data under USDOL's Open Data Policy." Scholarship Finder lists 9,500+ awards. | careeronestop.org Web API page, Scholarship Finder | Storing CareerOneStop scholarships is allowed. **Not yet confirmed:** the exact scholarship API endpoint and fields (their technical pages blocked automated fetches). Confirm at registration. |
| College Scorecard field-of-study data uses the first four digits of the CIP code. | collegescorecard.ed.gov glossary | Crosswalk (6-digit CIP) needs a 4-digit join column. |
| USAJOBS Pathways internships are open to students "in an accredited high school, college or graduate institution." | usajobs.gov | Official source for federal internships. API details to confirm in the pipeline spec. |
| Civil Rights Data Collection reports AP offerings by school, by subject area, a few years old. | civilrightsdata.ed.gov | Would require storing the student's school (excluded by SECURITY.md). Left out of v1. |
| context.dev scrape API: 1 credit per page; free tier 1,000 credits/month, no card; Developer plan $19/month for 7,500. Keys "have full access unless restricted to scopes." | docs.context.dev, context.dev/pricing | Use only for hard pages (JavaScript-heavy, PDFs) behind a fetcher interface; plain `fetch` + `cheerio` by default, to stay on the free tier. Scoped, server-only key. |

Still to verify (not assumed anywhere below as fact):
- Scorecard field-of-study row count (estimated "a few hundred thousand"); measure on first load.
- Supabase free-tier behavior (500 MB database; project pausing when inactive; built-in email sending limits) against current Supabase docs.
- Privacy law applicability for sensitive data about known minors (state laws, size thresholds). Needs a written check before public launch. Not legal advice.

## Proposed fixes for the earlier open issues
These go into the specs listed; nothing is changed yet.

| # | Issue | Proposed fix | Lands in |
|---|---|---|---|
| 1 | "Delete my account" needs to delete the auth user, but the service-role key is banned from app code. | A narrow `security definer` database function `delete_my_account()` that deletes only `auth.uid()`'s row; everything else cascades. Decision record. | Spec 1 |
| 2 | DESIGN.md empty while the accounts spec has UI. | Choose a design direction before building UI. (Done in this pass: see DESIGN.md.) | Spec 0 |
| 3 | How the 13+ checkbox reaches the database. | Server validates the checkbox with zod; a trigger creates the profile row and refuses sign-up without the flag; users cannot update `age_confirmed`. | Spec 1 |
| 4 | Pay in v1 or not. | In v1, from O*NET Job Outlook (salary + outlook rating). BLS Employment Projections detail stays "later". | Spec 3 |
| 5 | Nothing creates `saved_items`. | Career Explorer migration creates it (exclusive-arc design, see 2.7). | Spec 3 |
| 6 | "Related careers" has no storage. | `occupation_related` table from O*NET Related Occupations. | Spec 3 |
| 7 | Import job before spec approval. | The pipeline gets its own spec (#2); O*NET is its first adapter. Reword the career-explorer status line. | Specs 2, 3 |
| 8 | Scheduler undecided. | GitHub Actions schedule (free, runs TypeScript). Raspberry Pi as fallback for sites that block cloud IPs. | Spec 2 |
| 9 | SOC/CIP granularity. | Store full O*NET codes plus computed 6-digit SOC; crosswalk stores 6-digit CIP plus computed 4-digit CIP. Confirm against the downloaded crosswalk file. | Specs 3, 5 |
| 10 | Terms, Privacy, homepage screenshots unplanned. | "Legal pages" spec before launch; screenshots once real features exist. | Spec 10 |
| 11 | Housekeeping | Add `ONET_API_KEY`, `SCORECARD_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CAREERONESTOP_*`, `USAJOBS_*`, `CONTEXT_DEV_API_KEY` names to `.env.example`; fix or remove the "Cloudflare security-audit skill" reference in SECURITY.md; align TOOLS.md Scorecard timing; relabel grad year as "expected graduation year"; fill the PROGRESS.md date. | Spec 0 |

## Section 1: v1 scope and build order (approved in chat)
| # | Spec | New or changed | What it delivers |
|---|---|---|---|
| 0 | Doc fixes + design direction | changed | Fixes above; design direction recorded. No code. |
| 1 | Accounts & profile | changed | Account deletion function (fix 1), protected `age_confirmed` (fix 3) |
| 2 | Data pipeline foundation | new | Shared adapter framework, site allowlist doc, GitHub Actions schedule; O*NET is its first adapter |
| 3 | Career Explorer | changed | Pay and outlook, related careers, `saved_items` |
| 4 | Interest quiz | unchanged | O*NET Interest Profiler, scored locally |
| 5 | Programs & colleges | unchanged | Scorecard + crosswalk (fix 9) |
| 6 | AP & academics suggestions | new | "For this career, these AP classes help." |
| 7 | Scholarships | new | CareerOneStop + allowlisted sites + eligibility profile |
| 8 | Internships & programs | new | USAJOBS Pathways + allowlisted internship and summer-program sites |
| 9 | Saved plan + year-by-year planner | extended | Saved items become a grade-by-grade plan with live deadlines |
| 10 | Legal pages | new | Terms + Privacy in plain language, covering eligibility data |

- The pipeline comes before Career Explorer so O*NET is built on the same
  framework the scrapers will use.
- AP suggestions need no scraping: O*NET rates how important each knowledge
  area is to each career; one hand-written table maps O*NET's ~33 knowledge
  areas to the ~40 AP courses.
- Proposed addition to "How we'll know it works": at least half of test
  students find one scholarship they qualify for whose deadline hasn't passed.
- Left out of v1: which high school offers which AP classes (would require
  storing the student's school).

## Section 2: data model (approved in chat)

### 2.1 Where tables live
| Schema | Reachable through Supabase's API? | Holds |
|---|---|---|
| `public` | Yes, with RLS deciding what each person sees | Reference data (read-only) and user data (owner-only) |
| `ingest` | No (not exposed) | Staging tables, fetch logs, import runs |

Import jobs write to `ingest` staging tables, validate, then move good rows
into `public` in one transaction. A failed or partial run never shows
students half-updated data.

### 2.2 Conventions
- Keys: government data keeps natural keys (O*NET code, `unitid`, CIP).
  Scraped listings get a generated `id` plus `unique (source_id, source_record_id)`;
  pages without an ID use their normalized URL as `source_record_id`.
- Categories: `text` + `check (value in (...))`, not Postgres enums (enums are
  hard to rename or shrink in migrations).
- Money: whole dollars as integers. Deadlines: `date`. Other times: `timestamptz`.
- Empty means "not reported", never 0. Checks such as `median_earnings > 0`
  make a suppressed value impossible to store as 0.
- Provenance on every reference row: `source_id`, `retrieved_at`. Listings
  also: `first_seen_at`, `last_seen_at`, `content_hash`.

### 2.3 Careers (O*NET bulk download; API for pay and outlook)
| Table | Contents |
|---|---|
| `occupations` | `onet_code` (e.g. `29-1141.00`), computed `soc_code` (`29-1141`), title, description, job zone (1 to 5), typical education, pay (low/median/high + year), outlook rating, six interest scores, O*NET release number |
| `occupation_titles` | Alternate and lay titles, for search only |
| `occupation_knowledge` | One row per occupation per knowledge area with importance (normalized because the AP mapping joins on it) |
| `occupation_details` | Tasks and skills as JSON (display only) |
| `occupation_related` | Related careers with O*NET's relatedness tier |
| `interest_questions` | Interest Profiler questions cached once; scoring in our code; matching compares the student's six scores with each occupation's interest scores. No per-visit O*NET calls. |

### 2.4 Colleges (Scorecard + crosswalk)
- `institutions`: `unitid`, name, city, state, control (public, private
  nonprofit, for-profit), average net price, admission rate, graduation rate
  (each may be "not reported").
- `programs`: generated `id` plus `unique (unitid, cip4, credential_level)`;
  median debt and Scorecard's published earnings measures. Upserts match on
  the natural key so `id` stays stable for saved items.
- `occupation_program_map`: `soc_code` (6-digit) + `cip6`, computed `cip4`.
  One SOC code covers several O*NET codes, so careers join through
  `soc_code` and programs through `cip4`.

### 2.5 Academics
- `ap_courses`: ~40 courses, hand-entered in a migration.
- `knowledge_ap_map`: O*NET knowledge area to AP course.
- Suggestion rule: a career's knowledge areas with importance at or above a
  cutoff (start at 3.5 of 5, tuned in the spec) join the map, ranked by importance.
- Source line: "Based on O*NET knowledge ratings. AP is a trademark of College
  Board." plus a note that the mapping is Stepwell's own.

### 2.6 Scholarships and opportunities
- `sources`: kind (api, dataset, scrape, manual), terms and robots.txt check
  dates, fetcher, attribution text, refresh interval. One pull request adds
  the allowlist doc entry, this row and the adapter together.
- `scholarships`: title, sponsor, https link, amount min/max + note ("full
  tuition"), deadline, `recurs_annually`, levels (grade 9 to 12, undergrad,
  grad, adult), `eligibility_parsed` (complete, partial, none), `duplicate_of`,
  short summary (max 500 characters, only from sources that allow copying).
  Listings that charge an application fee are rejected (a common scam sign
  named by the FTC).
- `scholarship_criteria`: one row per restriction (state, minimum GPA, field
  as 2-digit CIP family, heritage, gender, first-generation, disability,
  religion, military family, citizenship, income limit, grade). No row means
  no restriction.
- `opportunities`: internships, summer and pre-college programs (`kind`),
  org, link, state/city/remote, minimum grade and minimum age, paid or cost,
  financial aid, deadline, start and end dates. Minimum age is shown but not
  checked (Stepwell stores no ages); fit is estimated from grade.
- `listing_fields`: tags listings with 2-digit CIP families so career pages
  find them (career to crosswalk to CIP family to listings).

Listing lifecycle (store lasting facts; compute date-based states when read):
| State | Stored or computed | Rule | Students see |
|---|---|---|---|
| rejected | stored | Failed validation or scam check | Never shown |
| gone | stored | Missing from its source in 2 successful runs in a row (failed runs never count) | Hidden; saved copies say "No longer listed by the sponsor" |
| active | computed | Deadline in the future or unknown | Normal listing |
| between cycles | computed | Deadline passed, repeats yearly | "Usually due around (date)" |
| closed | computed | Deadline passed, does not repeat | Hidden from search; kept in saved lists |

Reference rows are never hard-deleted, so saved items never point at nothing.

### 2.7 User data (all cascades on account deletion)
- `profiles`: as in the accounts spec; grad year relabeled "expected
  graduation year" (1950 to 2040). `age_confirmed` set only by the sign-up
  trigger; users may update every column except `id`, `age_confirmed` and
  timestamps (column-level grants).
- `eligibility_profiles`: row exists only after opt-in; turning off deletes
  it. All fields optional, empty = "prefer not to say": unweighted GPA
  (0 to 4.0), intended fields, first-generation, heritage (fixed list),
  gender, religion, disability, military family, citizenship status,
  household income band; plus `consent_version` and `consented_at`
  (re-ask when the privacy text changes).
- `interest_results`: latest result only.
- `saved_items`: exclusive arc. One nullable FK column per kind (`onet_code`,
  `unitid`, `program_id`, `scholarship_id`, `opportunity_id`,
  `ap_course_code`) with `check (num_nonnulls(...) = 1)`. `user_id` defaults
  to `auth.uid()` and is not writable from the browser.
- `plan_items` (replaces `plan_steps`): academic year (2027 = 2027 to 2028),
  term (fall, spring, summer, full year), kind (class, task, application),
  title, notes, optional link to a saved item or AP course, due date, status
  (todo, doing, done), position. Saved listings' deadlines are read live in
  the planner view, not copied. Grade labels computed from grad year.

### 2.8 Matching (inside the database)
A function running as the signed-in user compares their eligibility row with
`scholarship_criteria` and returns:
- You qualify: every restriction met by a given answer, and eligibility fully parsed.
- You might qualify: a restriction depends on a blank answer, or the listing
  was only partly parsed. Shows "Check the sponsor's page for: ...".
- Hidden: a restriction clearly does not fit.
A blank answer never excludes a student. Sensitive answers never pass through
app code, logs or error tracking.

### 2.9 Access
| Data | Anonymous | Signed-in student | Import jobs |
|---|---|---|---|
| Reference tables, visible-listing views | read | read | write (service-role key, jobs only) |
| `profiles`, `eligibility_profiles`, `interest_results`, `saved_items`, `plan_items` | none | own rows only | none |
| `ingest` schema | none (not exposed) | none | read/write |
| `delete_my_account()` | none | own account only | none |

`using (true)` read policies appear only on reference data (SECURITY.md).

### 2.10 Search, size, seed data
- Career search: `occupation_search` (titles + alternate titles) with full-text
  search and `pg_trgm` for typos; exact titles rank above alternate titles.
- Size: all small except Scorecard programs (estimated a few hundred thousand
  rows); should fit the free 500 MB database storing only used columns.
  Measured on first load.
- Hand-entered data (`ap_courses`, `knowledge_ap_map`, `sources`) lives in
  migrations so every change is reviewed.

## Eligibility data safeguards (from the "save everything" decision)
- Every sensitive field optional, with "Prefer not to say".
- Separate owner-only table (`eligibility_profiles`) with RLS; used only for
  matching; never logged, never sent to error tracking, never shown to others.
- Plain-language opt-in screen before collection; turning it off deletes the data.
- Delete per field or all at once; included in "Delete my account".
- New decision record replacing the minimum-data parts of decision 0002 and
  SECURITY.md line "Minimum data".
- Legal review before public launch (state laws on sensitive data of known minors).
- Still to decide in Section 4: retention period for unused eligibility data.

## Design direction
Three options were proposed, all checked against `docs/design/AVOID.md`:
1. Public Record: cool grey, navy, deep green; Source Serif 4 + Public Sans; 2px corners.
2. Wayfinding: warm grey, route blue, signal yellow fill; Overpass + Atkinson Hyperlegible; 4px corners.
3. Water and Stone: pale mineral, deep teal, pomegranate; Bitter + Libre Franklin; square corners.

Chosen: Water and Stone mixed with Wayfinding. Full tokens and component
patterns are recorded in `docs/design/DESIGN.md` (applied to the starter page).

## Section 3: data pipeline (awaiting review)

### 3.1 Units
Each unit has one job and can be tested alone.

| Unit | Where | Does | Depends on |
|---|---|---|---|
| Runner | `src/jobs/run.ts` | Command line: `import <source>`, `import --due` (every source whose refresh interval has passed), `--dry-run`. Opens and closes the `import_runs` row. | everything below |
| Source adapters | `src/jobs/sources/<slug>.ts` | Per source: `discover()` lists the URLs or API pages to read; `parse()` turns one response into raw records; `normalize()` turns a raw record into our shape. Adapters never fetch or touch the database themselves; they are handed a fetcher. | fetcher interface, schemas |
| Fetchers | `src/jobs/fetch/` | One `Fetcher` interface (`get(url)` returns status, body, content type, final URL). `plainFetcher` (Node `fetch`), `contextDevFetcher` (JavaScript-heavy pages and PDFs), and API clients (O*NET, CareerOneStop, USAJOBS, Scorecard). All go through the politeness layer. | politeness |
| Politeness | `src/jobs/fetch/polite.ts` | robots.txt, per-host rate limits, User-Agent, conditional requests, retries | none |
| Schemas | `src/jobs/schemas/` | zod schemas for every record kind: the single definition of "a valid record" | zod |
| Quality checks | `src/jobs/quality/` | Scam rules, deadline and amount sanity, link rules. Returns pass, or a rejection reason. | schemas |
| Loader | `src/jobs/load.ts` + SQL functions in `ingest` | Writes staging rows, then merges into `public` in one transaction; dedupe; gone detection | Supabase service-role client |

How the jobs run (Node 24's built-in TypeScript support or `tsx`) is decided
in the implementation plan.

### 3.2 One run, step by step
1. Open an `import_runs` row (status running).
2. Permission gate: the source must be `allowed` with `terms_checked_at`
   within the last 12 months; otherwise stop with "re-check terms" and touch
   no data.
3. robots.txt (scraped sources): read fresh every run. If a page we use is
   now disallowed, pause the source (`allowed = false`, reason recorded),
   hide its listings until a person reviews it, and alert.
4. Discover and fetch, politely (3.3).
5. Parse, normalize and validate each record with zod. A bad record is kept
   in staging as rejected with its reason; it never stops the run.
6. Quality checks (scam and sanity rules).
7. Circuit breaker before merging. Abort the merge (run = failed, students
   keep the last good data) if valid records are under 50% of the last
   successful run, if more than 20% were rejected, or if there are none. A
   scraper that suddenly finds nothing is broken, not an empty site.
8. Merge in one transaction: upsert on `(source_id, source_record_id)`,
   update `last_seen_at`, record changes by `content_hash`, mark `gone` after
   2 successful runs in a row without the row, then dedupe (3.6).
9. Close the run: status, counts (seen, new, changed, gone, rejected),
   context.dev credits used.

### 3.3 Politeness and fetch rules
- User-Agent: `StepwellBot/1.0 (+<Stepwell URL>/about-data; <contact address>)`.
- Scraped sites: at most 1 request every 5 seconds per host, slower if
  robots.txt `Crawl-delay` or the site's terms say so. APIs follow their
  documented limits (O*NET terms give per-second and per-day guidance; the
  Scorecard key is limited per hour).
- Conditional requests (ETag, If-Modified-Since) so unchanged pages cost
  nothing; `content_hash` skips re-parsing identical content.
- Retries: 429 and 5xx up to 3 times with growing waits, honoring
  Retry-After. Other 4xx are logged, not retried.
- Adapters fetch only the pages they list; no following links off-site; a
  per-source page cap per run (starting at 2,000) stops runaway crawls.
- No logins, no CAPTCHAs, no getting around bot protection. A site that
  blocks Stepwell leaves the allowlist instead of being worked around.

### 3.4 context.dev budget guard
- Only adapters that declare the `contextDev` fetcher use it.
- Every response reports `credits_remaining`. Below 100, the fetcher stops
  using context.dev until the next month; those pages are skipped, their
  listings keep the last good data, and skipped pages never count toward
  "gone".
- Credits per source are recorded per run. A source that needs more than
  about 500 credits a month is reconsidered (plain fetch, or dropped).

### 3.5 What we copy
- Always: facts (title, sponsor, amount, deadline, eligibility rules, link).
  In the U.S., facts like dates and amounts generally aren't protected by
  copyright; creative descriptions are.
- Descriptions: only from sources whose terms allow reuse (CareerOneStop open
  data, government sites), at most 500 characters. Otherwise no description:
  students follow the link.
- Never: images, logos (unless attribution requires them), or names, emails
  and phone numbers of people found on pages.

### 3.6 Dedupe
- Candidates: same domain and normalized titles at least 0.8 similar
  (`pg_trgm`), or the same amount and deadline with a similar sponsor name.
- Precedence: the sponsor's own page, then government sources (CareerOneStop,
  USAJOBS), then other allowlisted sites. The winner is shown; the others get
  `duplicate_of`.
- Start strict and tune on real data: two copies of a listing are a smaller
  problem than two different scholarships merged into one.

### 3.7 Scheduling
- GitHub Actions workflow `.github/workflows/import.yml`:
  - `schedule` once a day at an odd minute (e.g. 09:17 UTC; runs at the top
    of the hour are more often delayed), running `import --due`;
  - `workflow_dispatch` with a source input for manual runs;
  - `concurrency: import` so runs never overlap; `timeout-minutes: 60`;
    Node 24 like CI.
- Refresh intervals (stored per source): O*NET bulk data checked monthly for
  a new release, pay and outlook quarterly; Scorecard checked monthly;
  CareerOneStop weekly; USAJOBS daily (postings close fast); scraped sites
  weekly.
- Secrets live in GitHub Actions secrets, names only in `.env.example`:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ONET_API_KEY`,
  `SCORECARD_API_KEY`, CareerOneStop and USAJOBS credentials (exact names
  confirmed at registration), `CONTEXT_DEV_API_KEY`.
- The repo is private, so Actions minutes come from a monthly free allowance
  (verify the current amount in GitHub's billing docs; GitHub Pro from the
  Student Pack raises it). Estimate: 5 to 15 minutes a day, roughly 150 to
  450 minutes a month. GitHub documents auto-disabling scheduled workflows
  after 60 days without activity for public repos; confirm for private ones.
- Raspberry Pi fallback: the same code on a systemd timer, only for a site
  that blocks cloud servers. Not set up in v1 unless needed (it would be a
  second place holding the service-role key).

### 3.8 Monitoring (no new services)
- `ingest.import_runs` keeps every run's counts and errors; the first 20
  rejected records per run are kept with their reasons.
- Each run writes a summary table to the Actions job summary.
- A failed workflow sends GitHub's failure email (for scheduled workflows,
  GitHub notifies the person who last edited the schedule).
- A freshness step at the end of each daily run fails the workflow (and so
  emails) if any active source's last successful run is older than twice its
  refresh interval.
- No admin pages in v1 (SECURITY.md): the Actions summary and Supabase's
  table editor are enough.

### 3.9 Adding a source, and takedowns
One pull request adds a source, with three parts:
1. An entry in a new "Allowlisted sites" section of `docs/DATA_SOURCES.md`:
   owner, pages fetched, what we take, terms link with the relevant sentence
   quoted and the date checked, robots.txt result and date, rate limit,
   attribution text, contact.
2. A migration adding its `sources` row.
3. The adapter, saved fixture pages, and tests.
Terms are re-checked yearly (the runner refuses after 12 months). If a site
owner asks Stepwell to stop: the same day, set `allowed = false` (hides its
listings); then remove the adapter in a pull request and confirm to them,
within 48 hours.

### 3.10 Testing
- Adapters are tested against saved copies of real pages and API responses,
  never the network. When a site changes: save a new fixture, watch the test
  fail, fix the parser.
- Schemas and quality rules: unit tests with real scam patterns (application
  fee, "guaranteed", requests for bank details or Social Security numbers).
- Merge, gone detection and dedupe: SQL tests against a local Supabase
  (needs Docker, which RLS tests need anyway).
- `--dry-run` fetches and parses live, prints counts and 5 sample records,
  and writes nothing; used before merging a new adapter.

### 3.11 Security boundaries
- `src/app` may never import `src/jobs` (ESLint `no-restricted-imports`);
  the service-role key is read only in `src/jobs/env.ts`, validated with zod.
- Scraped text is untrusted: stored as plain text with length limits and
  control characters stripped, rendered only through React (escaped), never
  as HTML.
- Listing links must be https and on the sponsor's or the source's domain;
  tracking parameters (`utm_*`) are removed; the domain is shown next to the link.

### Section 3 open items
- A contact address for the User-Agent and takedown requests: a Stepwell
  address, not a personal email (it is sent to every site we read).
- Verify: GitHub Actions allowance for private repos; whether daily writes
  keep a free Supabase project from pausing; CareerOneStop and USAJOBS
  credential names.

## Not drafted yet
- Section 4: privacy safeguards in detail, retention, final fix list.
- Then: write the approved spec, self-review, user review, implementation plan.
