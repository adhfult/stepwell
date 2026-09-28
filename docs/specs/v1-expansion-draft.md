# Draft: v1 expansion (academics, scholarships, opportunities)

- Status: draft, not approved
- Started: 2026-09-27
- Design stage reached: Sections 1 and 2 presented (Section 1 approved in chat,
  Section 2 expanded and awaiting review). Sections 3 and 4 not drafted yet.
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

## Section 2: data model (expanded, awaiting review)

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

Chosen: Water and Stone mixed with Wayfinding. Full tokens are recorded in
`docs/design/DESIGN.md`.

## Not drafted yet
- Section 3: pipeline (adapters, fetcher interface, allowlist process,
  rate limits and politeness, scheduling, monitoring, failure handling).
- Section 4: privacy safeguards in detail, retention, final fix list.
- Then: write the approved spec, self-review, user review, implementation plan.
