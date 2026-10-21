# Progress log: Stepwell

Agents: read this first each session; add an entry at the end of each session.
Newest entries at the top. Keep each entry short.

## Next up
**Launch path (2026-10-20; the app is built, what's left is accounts and checks):**
1. **Owner:** domain (gates email, Turnstile and Vercel), then email sending,
   production Supabase project and Auth settings, Turnstile keys, Vercel with
   rate-limit rules, two-factor sign-in. All in `docs/LAUNCH.md`.
2. **Owner:** legal placeholders in `src/lib/legal/details.ts`
   (`placeholdersLeft()` empty) and a legal review; decide the open questions
   in `accounts-and-profile.md`.
3. **Claude, once 1 and 2 exist:** `db push` to production (only when the
   owner says), pre-ship-security skill, Cloudflare security-audit skill,
   two-account test on production.
4. Soft launch to about 10 students (`PRODUCT.md` "How we'll know it works").
After launch, in this order: career summaries (`career-summaries.md`, draft,
needs owner approval), work context and pay by state (no AI), interactive
quiz, course overviews, student AI helper (after real students).
**Parked by the owner (2026-10-20):** reading scholarship pages with AI and
more states' local scholarships; decide later.

**Public repository (2026-10-20, owner chose public so GitHub Actions is
free):** history scanned clean; Claude workflows deleted; LICENSE (AGPL-3.0),
README and `.github/SECURITY.md` added. When filling `src/lib/legal/details.ts`,
use an address on the new domain, not a personal one (it is public in the
code). After the switch: outside-contributor workflow approval, secret
scanning with push protection, private vulnerability reporting, wiki off,
then re-run CI and "Import data". Delete the unused `CLAUDE_CODE_OAUTH_TOKEN`
secret in GitHub.

**Other open items:**
- [ ] **Owner:** review `data/award-sites/ca.json` (46 links) and
      `data/scholarships/private.json` (19 programs). Both are live on the
      cloud (migration applied, pushed, import run 37561284140 added 19).
- [ ] Next states for local scholarships: `/award-sites-research` skill,
      `npm run award-sites:gaps -- <ST>` (docs/tools.md).
- [ ] Athlete rules: re-check every August against the new NCAA guide
      (`src/lib/athletes/rules.ts`, spec "Rules checked").
- [ ] Re-take `public/screenshots/plan.png` (needs a signed-in test
      account) so it shows the Bricolage headings like the other three.
- [ ] **Owner, before launch (security audit 2026-09-29):** turn on
      "Secure password change" in the development project's Auth settings
      now (LAUNCH.md step 3 covers production). Sign-in rate limits are
      decided (decision 0009); their settings are in LAUNCH.md steps 3
      and 5.
- [ ] **CareerOneStop:** youth programs, licenses and certifications are
      built (spec `careeronestop.md`). Owner: ask CareerOneStop to enable
      the Training Finder (401 for this token) and whether the Scholarship
      Finder data is available (not in the API). Scholarships: the owner is
      looking for another tool.
- [ ] **Owner:** fill the legal placeholders in `src/lib/legal/details.ts`
      (contact email, email provider, law state, effective date);
      `placeholdersLeft()` must be empty before launch.
- [ ] Work through the rest of `docs/LAUNCH.md` (domain, email sending,
      production Supabase project, real Turnstile keys, Vercel) before real
      students
- [ ] **Owner:** confirm or replace `IMPORT_CONTACT` (set to
      https://github.com/adhfult for now)
- [ ] Review the defaults taken on 2026-09-29: planner (no starter tasks,
      no notes; saved-plan spec's Result) and programs (official sources
      only, free or paid only; programs spec). Programs for MO, NH, TN, VT
      and WY weren't found under those rules.
- [ ] Review the AP mapping in `docs/specs/ap-suggestions.md` (Stepwell's
      own judgment; easy to change in one migration)


## 2026-10-20: AI decision, Supabase grants
- Decision 0016: AI only through the Anthropic API, server-side; no resellers
  or gateways. Draft spec `career-summaries.md` (not approved, not built).
  PRODUCT.md and roadmap item 7 updated.
- Supabase stops auto-granting Data API access to new `public` tables on
  2026-10-30. Checked all 27 tables: each migration already grants
  explicitly, so nothing breaks, including the future production project.
  Rule added to AGENTS.md and the supabase-migration skill. Not tested
  against the new behavior (it starts 2026-10-30).

## 2026-10-06: More scholarships (roadmap 4, part 1)
- Built spec `more-scholarships.md` (decision 0015): optional private county
  on the profile, a linked "Local scholarships" directory on /scholarships
  (community foundations by county), college pages link to the college's own
  scholarship page, and 19 large private national programs (`pv-` ids).
- Links only, no copying awards: context.dev was paid, local Ollama took
  ~9 min a page, and Blackbaud's terms forbid scraping AcademicWorks.
- `npm run award-sites:check` (also in the monthly recheck job) confirms
  every link answers. Migration applied locally only.
- Checked in the browser: San Diego County shows the San Diego Foundation at
  320 and 1280px, no sideways scroll; Cal Poly Pomona shows its link.
## Log
### 2026-10-05: athlete path review fixes
- EADA: a combined row ("Swimming and Diving", "Track and Field and Cross
  Country") counts toward each sport it covers until a split row arrives,
  so it no longer overwrites split counts (owner chose coverage over exact
  rosters 2026-10-06). Blank rows skip.
- `/athletes`: NAIA check shows with GPA or scores and no classes; the
  checker resets when the saved class list changes; timeline steps from
  past school years land in this one; college students get a plain "for
  high school students" message.
- Team filter works without a sport (`data.ts` and `search_colleges`; the
  athletics migration was edited in place since it isn't on the cloud yet).
- An old `/gpa` tab no longer erases class tags (`keepTags`).
### 2026-10-04: college athlete path (spec ncaa-athlete-path.md, roadmap project 3, decision 0014)
- Built per `docs/specs/ncaa-athlete-path.md` and decision 0014: EADA import
  (`eada`, 2,037 colleges, 18,377 teams locally), sport/team/level filters
  on `/colleges`, a Sports section on college pages, and `/athletes` (rules
  checked on official pages 2026-10-04, core-course checker on saved `/gpa`
  classes, NAIA check, timeline that adds to `/plan` once).
- Class tags (`core`, `year`) live on `academic_records.courses`; `/gpa`
  keeps them (tested in the browser).
- Header: from 1024px only "Sign in" shows (no "Create account") so nine
  main links fit on one line.
- Open: inline-style CSP errors after client-side page changes on
  `/colleges` (also on `?state=OH`, so not from this work); two pgTAP tests
  count all rows and fail once the local test account has saved data.
### 2026-10-04: GPA and test scores (spec gpa-and-tests.md, roadmap project 2, decision 0013)
- College directory pushed; its migration applied to the cloud and the
  Scorecard import re-run there (5,787 colleges, 949 with SAT ranges). The
  import's "changed" count only watches the 5 original columns, so it said 0.
- `/gpa` ("GPA" in the nav): class list (type, grade or "Not finished yet",
  credits), known-GPA shortcut, editable weights, live unweighted and
  weighted GPA, "what grade do I need" (lowest letter in every unfinished
  class), highest reachable, SAT/ACT conversion with links to `/colleges`.
- Works signed out (draft in localStorage, loaded only after hydration so
  it can't be overwritten). Signed in: consent, save, change, remove;
  "Use 3.70 for scholarship matching" for students already opted in.
- Concordance: ACT's 2018 tables, still the official ones (ACT's page and
  the College Board say so; the 2025 ACT composite has no newer table).
  Tables A1 and A2 share the same ranges, so one list converts both ways.
- `testFit` converts with the concordance when the college reports only the
  other test; `/colleges` and `/colleges/[unitid]` use saved scores when the
  URL has none.
- Data: `academic_records` (owner-only RLS, jsonb course check function,
  12-month purge). Privacy page updated.
- Verified: `npm run check`; `npm run test:db` (280); production build;
  Playwright signed out and signed in (local test user): draft survives
  reload, save without consent refused, save, reload, college markers, remove,
  scholarship GPA; 320 and 1280 with no overflow, nav fits at 1024, keyboard
  only, 0 console errors.
### 2026-10-04: College directory (spec college-directory.md, roadmap project 1)
- `/colleges`: name search, state and sort up front; cost by income bracket,
  "most I'd pay", My SAT/ACT, type, size, admission rate, test-optional,
  setting, length, minority-serving and program fold into "More filters".
  24 a page, total, a page past the end shows the last page. SAT/ACT marker
  ("below/in/above the middle 50%"); with both scores it uses SAT when the
  college reports it, else ACT (owner was away; easy to change in `testFit`).
- `/colleges/[unitid]`: facts, net price by income, programs by credential,
  save (sign-in link when signed out). Career colleges, home example and My
  plan link college names here. "Colleges" added to the nav (fits at 1024px).
- Data: new `institutions` columns, `search_colleges()` RPC (security invoker,
  validated, LIKE wildcards escaped), Scorecard import reads the new fields.
- Fixed: five pgTAP files failed once CareerOneStop data was imported locally
  (non-cascading FKs to occupations); they now clear those tables first.
- Verified: `npm run check`; `npm run test:db` (266); production build;
  Playwright 320/390/1280 on 10 pages: no overflow, 0 console/CSP errors,
  CLS 0; keyboard-only filtering works.
- Known: an unknown college id renders the not-found page with status 200
  (the loading skeleton streams first), same as `/careers/[code]`.
- Not checked: the signed-in save button on a college page (needs a test
  account).
### 2026-10-04: Intro page (spec intro-page.md, decision 0012)
- Owner asked for an introduction page holding most of the decoration, then
  calmer app pages and more information. Split into five projects; this is
  the first. Next: calmer, info-first app pages; then college detail pages,
  pay by state (BLS OEWS), and what the work is like (O*NET work context),
  each with its own spec.
- Home keeps its hero; slabs now link to four step sections that walk
  Registered Nurses in Ohio with live numbers (pay, the best-paid public or
  nonprofit bachelor's program, an open scholarship, an example plan year),
  alternating teal and stone with stepped edges, then sources, privacy and
  a closing search. Screenshots left the home page.
- Gotcha: catching errors around Supabase reads in a page also catches
  Next's dynamic-rendering signal, so the build prerendered "/" with every
  panel empty. `unstable_rethrow` in the catch fixes it.
- Verified on a production build at 320/390/1280: no overflow, zero console
  or CSP errors, CLS at most 0.01, slab links land on their step, focus
  visible, reduced motion; fallback lines shown for a nonexistent career.
  195 tests.

### 2026-10-04: Teal bands, dark footer and data bars (spec ui-color-and-data)
- Owner found the UI dull; chose "bolder, same palette" plus "data you can
  see" on all pages (decision 0011).
- Browsing pages start with a `primary` band (`<Band>` in page.tsx;
  `.band` in globals.css remaps colors inside). Footer is dark stone; the
  header marks the current section and has a step mark.
- Home: headline, search and the 3D stepwell share the band, above the
  fold. Career page: band shows median pay and outlook; path moves to a
  side column from 1024px.
- SVG bars on fixed scales (`lib/scale.ts`): career pay range, pay on
  career rows, four meters on college rows.
- Verified on a production build at 320/390/1280: no overflow, zero
  console/CSP errors, CLS at most 0.01. 193 tests. Screenshots re-taken.
- Pushed. Career rows on phones now show "Median pay $X a year" on one
  line (stacked from 640px). Still open: something below the band on
  signed-out /plan (owner to decide); signed-in /plan needs a test account.

### 2026-10-04: Footer layout shift fixed; home screenshots re-taken
- `<main>` is at least one screen tall (min-h-svh), so a short loading
  skeleton no longer pushes the footer: CLS 0 on six pages at 320/390/1280
  (was 0.10 to 0.30 on phones).
- career, colleges and scholarships screenshots re-taken (390px, 2x, prod
  build, signed out, quantized to about 45 KB). plan.png still old.
- `.claude/reports/` (local telemetry) is gitignored.

### 2026-10-04: Depth, motion and the 3D stepwell (spec ui-depth-and-motion)
- Owner chose: evolve Water and Stone, Bricolage Grotesque headings, an
  interactive 3D stepwell, stone keycap buttons. Decision 0010 relaxes the
  shadow and motion bans into a hard stone edge and a motion budget.
- Built with CSS only (3D transforms, `:has()`, `@property`) plus React's
  `<ViewTransition>`; no new dependencies.
- Gotchas: the 3D scene's own plane caught every click until
  `pointer-events: none`; the CSP allows `style.setProperty` but not
  server-rendered style attributes; the career title morph can't survive
  the `loading.tsx` skeleton, so it was dropped.

### 2026-10-04: CareerOneStop youth programs, licenses, certifications
- Token works; the API has no Scholarship Finder and Training is 401.
- Youth job programs on /programs (2,519 providers), licenses by state and
  core certifications on career pages; three cached sources, attribution
  to DOLETA and Minnesota DEED.
- Docker Desktop must be running for the local database (WSL
  integration); Kong sometimes exits after a restart: `docker start
  supabase_kong_stepwell`.

### 2026-09-30 (early): second security audit, rate limits
- Cloudflare's security-audit method (instructions read from GitHub, not
  installed; source-only, report in ~/security-audit-skill/stepwell/run-1):
  0 confirmed findings. One password lead was tested locally and accepted
  (SECURITY.md, LAUNCH.md). Its Claude-workflow lead didn't apply while the
  repo was private; the two Claude workflows were deleted before it went
  public (2026-10-20).
- Hardening from its notes: keyed API requests refuse redirects (checked
  live: USAJOBS, O*NET, Scorecard still import); HSTS header.
- Decision 0009: rate-limit sign-in at Vercel's firewall per IP; a secret
  key with `Sb-Forwarded-For` would have skipped Supabase's captcha.
- Home route line drawn as its own element; the owner's plugin settings
  committed.

### 2026-09-29 (night): everything in one go
- Planner saves internships (by closing year), AP classes (this year) and
  summer programs (by deadline), besides scholarships and colleges.
- `/programs`: 111 free or paid summer programs, internships and research
  from federal agencies, labs, states and public universities
  (`data/programs/`, table `student_programs`; `programs` was already
  College Scorecard's). Three research agents, 20 entries spot-checked
  (96 of 100 facts matched). Included in the monthly re-check.
- Security audit (agent, whole repo): fixed an open redirect in
  `safeNextPath` (dot segments), account deletion now needs a sign-in in
  the last 10 minutes, O*NET next links stay on O*NET, CI actions pinned
  to SHAs and the gitleaks download checksummed, secure password change on
  locally.
- Design audit at 320/390/640/768/1024: the header scrolled sideways at
  640px (now Menu until 1024px; My plan in the main links), quiet Save
  buttons in lists, plan years show their open/close marker, careers show
  three other names, all-caps USAJOBS titles fixed.
- New home page: first sentence says what Stepwell does, career search,
  then the route line with four real screenshots (`public/screenshots/`).
- The local database was found empty apart from seed data, which is what
  `supabase db reset` leaves (not confirmed by the owner); migrations had
  rebuilt it cleanly. All sources re-imported locally.
- Gotcha: `npx supabase migration new` waits on stdin when not in a
  terminal; run it with `</dev/null` (an empty migration got applied
  locally once and needed `migration repair --local`).

### 2026-09-29 (evening): About the data, re-check job, saved plan
- The owner said to proceed on the three draft specs; each open question
  took its default, written in each spec's Result.
- `/about-data` lists every source with its publisher, use, O*NET credit
  and last update; linked first in the footer.
- `npm run scholarships:due` and a monthly "Scholarship re-check" workflow
  that fails (so GitHub emails the owner) when entries are due. Ran once on
  GitHub: passed, nothing due.
- Saved plan: Save buttons on scholarships and college lists, `plan_items`,
  and `/plan` ("My plan" in the header from 640px; on phones via Account).
  pgTAP includes a merge that removes a saved scholarship; tried signed in
  at 320px (save, add, move, done, "No longer listed", cascade on account
  deletion).
- USAJOBS ran live: 60 student postings kept of 103 (unpaid and
  "open to everyone" jobs left out); fixture replaced with real postings.
- Row caps: 1,000 saved items and 500 plan steps per student.
- Cloud imports running: the owner set `IMPORT_DATABASE_URL` and the
  USAJOBS secrets; the first "Import data" run loaded every source (1,016
  careers, 5,787 colleges, 8,501 program links, 923 outlooks, 60 quiz
  questions, 264 scholarships, 60 internships, 0 rejected).
- Fixed: USAJOBS closing dates are judged in Eastern time (the first
  cloud run, at 8 pm Eastern, dropped 2 postings closing that day).
- Local Supabase's Kong container had stopped (exit 127); `docker start
  supabase_kong_stepwell` fixed it.

### 2026-09-29 (morning): legal pages, all states, internships
- Terms and Privacy pages and a site footer on every page; the sign-up
  form links both. Placeholders stay until launch (`placeholdersLeft()`).
- Scholarships: the other 45 states and DC (205 programs, 264 in all),
  researched by five agents; 13 facts spot-checked live (one fix);
  `data/scholarships/README.md` holds the research rules.
- Internships (`docs/specs/internships.md`): source `usajobs`,
  `opportunities` table, `/internships`, Menu link; migration pushed to the
  cloud (advisors: only the intended warning). Found: data.usajobs.gov's
  robots.txt disallows all crawlers, so this keyed API alone skips the
  robots check (decision 0007 addendum). Built from the API reference's
  example; not yet run live (no key).
- Found and fixed while testing: an impossible closing date would have
  failed the whole merge, and a malformed one would have crashed the
  import (zod 4 runs `.refine` after a failed regex).
- Tests: 156 unit, 203 pgTAP; Chrome at 320px and 1280px on a production
  build, no console or CSP errors. Firecrawl credits are low.


### 2026-09-29 (just after midnight): scholarships built (first batch)
- Owner chose: curated official list, skip the second question set, first
  batch federal + CA, TX, FL, NY, PA. Six research agents gathered 59
  programs from official pages; spot-checked, validated, imported.
- `scholarships`, `eligibility_profiles` (pg_cron retention),
  `match_scholarships()`; `/scholarships`, `/account/eligibility`, account
  and career page links; phone Menu button. Privacy draft updated.
  Pushed to the cloud.
- Still blocked for agents: the `importer` password and GitHub secret.

### 2026-09-28 (late night): scholarships source problem
- CareerOneStop's website returns 403 (CloudFront) to the owner on every
  network tried, so its API can't be registered for. No open scholarship
  dataset exists; the big aggregators forbid scraping. Drafted
  `docs/specs/scholarships.md` (curated official list) for review.
- USAJOBS's developer site is reachable (for internships, step 8).

### 2026-09-28 (late night): AP suggestions built
- Spec with the full knowledge-area to AP-course mapping
  (`docs/specs/ap-suggestions.md`); `knowledge_areas`, `ap_courses` (42),
  `knowledge_ap_map` (69), `occupation_knowledge` (29,964 ratings);
  `ap_courses_for_career()`; "Classes that help" on career pages (808
  careers). Pushed to the cloud.
- Still blocked for agents: the `importer` password and GitHub secret.

### 2026-09-28 (night): programs and colleges built
- Spec written and built (`docs/specs/programs-and-colleges.md`): sources
  `onet_cip` (O*NET's CIP to O*NET-SOC crosswalk, Excel, via the new
  `read-excel-file` dependency) and `scorecard` (College Scorecard API);
  `occupation_programs`, `institutions`, `programs`; `colleges_for_career()`;
  "Where to study" on career pages and `/careers/[code]/colleges` with state
  (profile state first) and credential filters. Pushed to the cloud.
- Sizes: 5,787 colleges, 164,316 programs (30 MB), 8,501 crosswalk links.
- Merged Dependabot PR #6 (actions/checkout v7 in the Claude workflows).
- Still blocked for agents: the `importer` password and GitHub secret.

### 2026-09-28 (evening, later): interest quiz built
- Spec written and built (`docs/specs/interest-quiz.md`): source `onet_ip`
  (60 questions); interest scores on `occupations`; `interest_results`
  (scores only, saved on request); `match_careers()` (correlation);
  `/interests` (5 pages of 12) and `/interests/results` (top areas, bars,
  10 closest careers then all 30, preparation filter, save and remove);
  account section; links from home and `/careers`. Pushed to the cloud.
- Scoring rule confirmed against O*NET's own documented example.
- Found: every page with a loading skeleton needs JavaScript (streamed
  content stays hidden without it). Kept the skeletons; corrected the
  Career Explorer spec's "works without JavaScript" claim.
- Still blocked for agents: the `importer` password and GitHub secret.

### 2026-09-28 (end of day): pay and outlook; dependencies
- Career Explorer step 6: new source `onet_outlook` (O*NET Web Services
  job outlook, 2 requests a second, 923 careers, 0 rejected, 8.4 minutes);
  `occupation_outlook`; "Pay and outlook" section on career pages and
  median pay in search results. Pushed to the cloud project.
- Keys: `ONET_API_KEY` and `SCORECARD_API_KEY` set in GitHub by the owner;
  local imports now read the local settings file too.
- Dependabot: merged React 19.3.0; ESLint 10, TypeScript 7 and
  `@types/node` 26 held back in `.github/dependabot.yml` (toolchain
  support; Node 24 runtime). The owner merged the Claude GitHub Actions
  workflows (PR #5).
- Still blocked for agents (secret writes): the `importer` password and
  `IMPORT_DATABASE_URL`, so scheduled imports end with a notice.

### 2026-09-28 (late night): cloud setup and Career Explorer built
- Pushed to GitHub; all migrations pushed to the cloud dev project (it was
  empty); pg_cron works there without extra grants; advisors: only the
  intended `delete_my_account()` warning.
- Import TLS: `pg` treats `sslmode=require` as full verification and the
  pooler chains to Supabase's own root, so the job now ships that public
  root certificate (fingerprint checked) instead of skipping verification.
  The pooler recognizes `importer.<ref>`; login waits for its password.
- Import workflow tested on GitHub: ends with a notice until the secret
  exists. `IMPORT_CONTACT` variable set.
- Career Explorer (spec rewritten and built, steps 1 to 5): retired careers
  instead of deletes; titles, details, related careers; `saved_items`;
  `search_occupations()` (10 ms, close spellings only when nothing matches);
  `/careers`, `/careers/[code]`, save/remove, saved list on `/account`,
  Careers in the header, search on the home page. The adapter now reads 10
  O*NET files (about 65 MB, 2 to 3 minutes, 560 MB peak memory).
- Found and fixed: a 60 s fetch timeout couldn't fit the 38 MB
  task_ratings download; O*NET's flagged education shares made Registered
  Nurses show a certificate.
- Tests: 95 unit, 110 pgTAP; Chrome at 320px and 1280px on a production
  build, no console or CSP errors.

### 2026-09-28 (night): data pipeline foundation built
- Spec approved and built in 5 steps. Decision 0008: import jobs log in as
  an `importer` Postgres role that can only call `ingest` functions (the
  unexposed `ingest` schema can't be reached through the Data API).
- `npm run import -- onet [--dry-run] [--force]` and `--due`; polite fetcher
  (robots.txt, 5 s per host, retries, page cap); zod validation; circuit
  breaker; one-transaction merge. O*NET 31.0: 1,016 occupations loaded
  locally. Daily GitHub Actions workflow (idle until its secret exists),
  freshness check, pg_cron clean-up of staged records after 30 days.
- Found: O*NET's ETags differ between its servers, so the release number
  decides "unchanged". Tests: 80 unit, 78 pgTAP; advisors clean.
- New dependencies: `pg`, `csv-parse`, `robots-parser`. Jobs run on Node
  24's built-in TypeScript (no build step).
- Open: `IMPORT_CONTACT` address (same as the legal pages' contact email);
  strip control characters from imported text (Section 3.11) before the
  first scraped source; a fresh `supabase db reset` hasn't been run since
  the pipeline migrations (it would wipe local test accounts); on the cloud
  push, check whether pg_cron needs `grant usage on schema cron to postgres`
  and that `importer.<ref>` can log in through the pooler.

### 2026-09-28 (evening): v1 expansion approved
- Sections 3 and 4 approved (retention: unconfirmed accounts 7 days,
  eligibility answers 12 months without sign-in, ingest logs 30 days).
- Applied to PRODUCT, ARCHITECTURE, DATA_SOURCES, TOOLS; decisions 0006
  (eligibility answers) and 0007 (scraping policy).
- Drafted `docs/specs/data-pipeline.md`. Found: O*NET 31.0 CSVs download
  per file without a key; the unexposed `ingest` schema can't be written
  through the service-role client, so the spec proposes a direct Postgres
  `importer` role via Supabase's IPv4 shared pooler.

### 2026-09-28 (later): hardening and launch prep
- Login cookies HttpOnly (and Secure in production); zod on the delete
  password; full nonce-based CSP from `src/proxy.ts` (production: zero
  violations on every page).
- Cloudflare Turnstile bot check on sign-up, sign-in, password reset and the
  delete password check (Supabase requires it for all of them once on);
  local test keys; a too-early submit waits for the token.
- `docs/LAUNCH.md` checklist; legal pages spec and plain-language drafts with
  placeholders (`docs/specs/legal-pages.md`, `docs/legal/`).

### 2026-09-28: accounts and profile built (spec steps 0-13)
- Spec reviewed, improved and approved; decisions 0004 (delete via
  `delete_my_account()`) and 0005 (neutral birth month/year age screen).
- Local Supabase in Docker (`npm run db:start`/`db:stop`, unused services
  excluded, ~570 MB); `profiles` + trigger + RLS + column grants and
  `delete_my_account()`, 35 pgTAP tests (`npm run test:db`), advisors clean.
- Built: security headers, header + DAL, sign-up (age gate, same answer for
  every address), scanner-safe email confirmation, sign-in/out, protected
  `/account`, profile form and summary, delete account (password re-check),
  forgot/reset password (15-minute email-link rule, other devices signed out).
- Mobile polish pass at 320/375px in real Chrome; `<Page>`/`<PageTitle>`;
  DESIGN.md updated. 47 unit tests; end-to-end checks for every step.
- Found and fixed: a used confirm link now continues when that browser is
  already signed in (seen once while the dev server compiled a page).
- Security review (pre-ship-security, review only): gitleaks and npm audit
  clean, no service-role key in app code, RLS verified with a real token.
  Proposed, awaiting approval: HttpOnly + Secure on login cookies; zod on
  the delete password. Recommended before launch: CAPTCHA on sign-up and the
  Cloudflare security-audit skill (users may be 13-17).
- Open questions: accounts never confirmed (delete after N days?); per-IP
  auth rate limits when auth runs in Server Actions; login cookie lifetime
  (400 days) on shared computers. Ponytail plugin enabled for the project.

### 2026-09-27: design direction and v1 expansion draft
- Reviewed all docs; unclear or contradictory items now have proposed fixes
  in `docs/specs/v1-expansion-draft.md` (not applied yet).
- Brainstormed the v1 expansion (AP suggestions, scholarships, internships and
  programs, year-by-year planner, scraping). Decided: all in v1; largest legal
  source set (CareerOneStop API as base, allowlisted sites only); save full
  scholarship-eligibility data with safeguards; shared pipeline with one
  adapter per source. Sections 1 (scope) and 2 (data model) approved;
  Section 3 awaiting review; Section 4 not drafted.
- Research: O*NET API v2 uses an API key (docs still say username/password);
  O*NET data is a CC BY bulk download and includes pay and outlook;
  CareerOneStop API data is open data.
- Design: Water and Stone + Wayfinding chosen; tokens and component patterns
  in `docs/design/DESIGN.md`. Applied in `globals.css`, `layout.tsx` (Bitter
  + Atkinson Hyperlegible Next, self-hosted) and the starter page. Light theme only.
- Merged to `main` and pushed; CI green.
- Open questions: a Stepwell contact address for the scraper's User-Agent;
  dark mode palette; verify Supabase free-tier limits (pausing, auth email)
  and GitHub Actions minutes for a private repo; PRODUCT.md questions (first
  states, quiz required or optional) still open.

### 2026-09-27: project created
- Created from template-web; docs added from the Stepwell kit.
- Next: review and approve the accounts-and-profile spec.
