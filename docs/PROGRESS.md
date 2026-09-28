# Progress log: Stepwell

Agents: read this first each session; add an entry at the end of each session.
Newest entries at the top. Keep each entry short.

## Next up
- [ ] Fill the placeholders in `docs/legal/privacy-draft.md` and
      `docs/legal/terms-draft.md` (name, contact email, email provider,
      state, date), approve `docs/specs/legal-pages.md`, then build the pages
      and the site footer
- [ ] Work through `docs/LAUNCH.md` (domain, email sending, production
      Supabase project, real Turnstile keys, Vercel) before real students
- [ ] Data imports in the cloud (`docs/LAUNCH.md`, "Data imports"): push the
      two pipeline migrations (with your OK), set the `importer` password,
      add the GitHub secret and `IMPORT_CONTACT`, run the workflow once
- [ ] Career Explorer: update `docs/specs/career-explorer.md` for the v1
      expansion (pay and outlook, related careers, `saved_items`, more O*NET
      files in the same adapter), approve, build

## Log
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
