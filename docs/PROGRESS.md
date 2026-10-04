# Progress log: Stepwell

Agents: read this first each session; add an entry at the end of each session.
Newest entries at the top. Keep each entry short.

## Next up
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

## Log
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
  0 confirmed findings. Its password lead was tested locally and is real
  within 24 hours of sign-in; recorded as an accepted risk (SECURITY.md,
  LAUNCH.md). Its Claude-workflow lead doesn't apply (the repo is private).
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
