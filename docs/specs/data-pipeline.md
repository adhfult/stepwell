# Spec: Data pipeline foundation (O*NET first)

- Status: draft (review, then change to "approved")
- Build step 2 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1 and 3). Career Explorer (step 3) builds on it.

## Goal
One shared, tested way to copy outside data into our tables: fetch politely,
validate, stage, then merge in one transaction. O*NET's occupation list is the
first source, so every later source (Scorecard, CareerOneStop, USAJOBS,
allowlisted sites) plugs into a pipeline that already works.

## User story
As the owner, I want to run one command (by hand or on a schedule) that
refreshes a source's data safely, so students always see complete, recent,
attributed data, and a broken source never wipes what's already there.

## Changes from the approved design (Section 3)
Found while writing this spec (checked 2026-09-28):
1. **Database access.** Section 3.1 says the loader uses the Supabase
   service-role client, but that client talks through Supabase's Data API,
   which can't reach the `ingest` schema (kept unexposed on purpose, 2.1).
   Proposed: the job connects straight to Postgres with the `pg` library as
   a dedicated `importer` role that can only call the pipeline's functions.
   It gets no rights on user tables or `auth`, and the service-role key is
   not used by the pipeline at all. From GitHub Actions it connects through
   Supabase's shared pooler in session mode: Supabase's docs say direct
   connections are IPv6-only on the free plan, while "the shared pooler is
   IPv4-only on every plan", and custom roles connect as `[ROLE].[PROJECT-REF]`.
   Recorded as decision 0008 on approval.
2. **O*NET files.** Release 31.0 is current. Each file downloads on its own
   as CSV (for example `/dl_files/database/db_31_0_csv/occupation_data.csv`,
   1,016 occupations, with an ETag), with no key. The first adapter needs no
   API key; `ONET_API_KEY` arrives with pay and outlook in Career Explorer.
3. **Secret names.** The pipeline needs `IMPORT_DATABASE_URL` (the importer's
   pooler connection string) instead of `SUPABASE_SERVICE_ROLE_KEY`.

## Acceptance criteria
Database
- [ ] New `ingest` schema, not exposed to the Data API; `anon` and
      `authenticated` have no rights on it.
- [ ] `public.sources` (reference data, public read): slug, name, kind (api,
      dataset, scrape, manual), homepage, terms URL, `terms_checked_at`,
      `allowed`, pause reason, refresh interval, attribution text, last
      successful run, and what the last run saw (`last_etag`,
      `last_release`) for the "unchanged" check. Seeded in the migration
      with the O*NET row.
- [ ] `ingest.import_runs`: source, start and end times, status (running,
      succeeded, failed, aborted, unchanged), counts (seen, new, changed,
      removed, rejected), error message.
- [ ] `ingest.staged_records`: run, record kind, source record id, payload
      (JSON), status (valid or rejected) and rejection reason.
- [ ] `public.occupations` (minimal; Career Explorer adds columns):
      `onet_code` primary key with a format check, computed `soc_code`,
      title, description, O*NET release, `source_id`, `retrieved_at`. RLS
      on, one read policy for `anon, authenticated`, select granted to them.
- [ ] `importer` login role, created without a password in the migration,
      and only if it doesn't exist yet (roles belong to the whole server,
      so a local `db reset` can find it already there).
      It may only execute the `ingest` functions below (all `security
      definer`, `set search_path = ''`, execute revoked from `public`):
      start a run, stage records, merge occupations, finish a run.
- [ ] Starting a run is the permission gate: it refuses a source that is not
      `allowed`, or whose `terms_checked_at` is missing or older than 12
      months, and records why.
- [ ] Merging happens in one transaction: upsert by `onet_code`, delete rows
      missing from the new release, record the counts. A failed merge
      leaves the old rows untouched.
- [ ] `pg_cron` deletes `staged_records` and runs older than 30 days
      (Section 4.2).

Fetching (`src/jobs/fetch/`)
- [ ] One `Fetcher` (`get(url)` returns status, body, content type, final
      URL, ETag) wrapped by a politeness layer: User-Agent
      `StepwellBot/1.0 (+contact)`, robots.txt checked before each host's
      first request in a run, at most one request per 5 seconds per host
      (or the site's `Crawl-delay` if slower), conditional requests with the
      last ETag, up to 3 retries on 429 and 5xx with growing waits and
      `Retry-After` respected, no retries on other 4xx, and a page cap per
      run (2,000).
- [ ] Without `IMPORT_CONTACT`, local runs send `StepwellBot/1.0
      (development)`; in CI the runner refuses to start without it.

Runner and O*NET adapter (`src/jobs/`)
- [ ] `npm run import -- <slug>`, `npm run import -- --due` (every source
      whose refresh interval has passed) and `--dry-run` (fetch and parse
      live, print counts and 5 samples, write nothing).
- [ ] The O*NET adapter finds the current release number on O*NET's
      database page, downloads `occupation_data.csv`, parses it with
      `csv-parse`, and validates every row with zod. A bad row is staged as
      rejected with its reason and doesn't stop the run.
- [ ] Unchanged file (304, or the same release as the last run): the run
      ends as "unchanged" without merging.
- [ ] Circuit breaker before merging: abort (students keep the last good
      data) if valid records are under 50% of the last successful run, more
      than 20% are rejected, or there are none. The 50% rule is skipped when
      the source has never succeeded (first run).
- [ ] Nothing outside `src/jobs` can import it (ESLint `no-restricted-imports`);
      settings are read and validated with zod only in `src/jobs/env.ts`.

Schedule (`.github/workflows/import.yml`)
- [ ] Daily at 09:17 UTC runs `--due`; manual runs with a source input;
      `concurrency: import`; 60-minute timeout; Node 24 like CI.
- [ ] Writes the run's counts to the job summary.
- [ ] Freshness check: fails (so GitHub emails the owner) if any active
      source's last success is older than twice its refresh interval.
- [ ] Without the `IMPORT_DATABASE_URL` secret, the job ends with a notice
      instead of failing, so no daily failure emails before setup.

Docs
- [ ] `.env.example` names `IMPORT_DATABASE_URL` and `IMPORT_CONTACT`, plus
      the later pipeline names from Section 3.7 (commented out).
- [ ] ARCHITECTURE.md (settings, imports), SECURITY.md (importer role),
      DATA_SOURCES.md (O*NET files and release check), decision 0008.
- [ ] `npm run check` and `npm run test:db` pass.

## Data
| Where | Who can read | Who can write |
|---|---|---|
| `public.sources`, `public.occupations` | everyone | only the `ingest` functions (via the importer) and migrations |
| `ingest.*` | nobody through the API | the `ingest` functions only |
| `importer` role | none | executes the `ingest` functions; nothing else |

Locally, `supabase/seed.sql` gives `importer` a known password, and the job
defaults to the local stack's URL when `IMPORT_DATABASE_URL` is unset. For
the cloud project, the owner sets the password once in the SQL editor and
stores the pooler URL as a GitHub Actions secret (never in the repo).

## Edge cases and errors
- O*NET down, or 5xx after retries: the run fails, the data stays, and GitHub
  emails on failure.
- O*NET renames the file or changes the columns: zod rejects the rows, the
  circuit breaker aborts, and a saved-fixture test shows the new shape.
- robots.txt starts disallowing the files: the source pauses (`allowed =
  false`, reason recorded) and the run fails loudly.
- Two runs at once: GitHub's `concurrency` prevents it; `start_run` also
  refuses while another run of that source is still "running" (under 2 hours
  old).
- A new release drops occupations: they are deleted (nothing references
  `occupations` yet; Career Explorer revisits this when `saved_items` does).

## Out of scope (lands in)
- Other O*NET files, pay and outlook, `ONET_API_KEY`: Career Explorer.
- context.dev fetcher and budget guard, scam and quality checks, dedupe,
  "gone after 2 runs" for listings: Scholarships (first scraped source).
- Scorecard, crosswalk: Programs and colleges. CareerOneStop, USAJOBS: their
  specs.
- Raspberry Pi fallback, admin pages: not in v1.
- Pushing migrations to the cloud project and adding the GitHub secret:
  owner's OK each time.

## Build steps (each: `npm run check`, its own check, one commit)
| # | Goal | Check |
|---|---|---|
| 1 | Migration: `ingest` schema, `sources` (O*NET row), `import_runs`, `staged_records`, `occupations`, `importer` role, functions, grants; `seed.sql` password | Studio shows the tables; pgTAP: anon reads `occupations` but not `ingest`; importer can't read `profiles` or `auth.users`, can't write `occupations` directly; the gate refuses stale terms |
| 2 | Fetch layer | Unit tests with a fake network: User-Agent, robots.txt, spacing, retries, `Retry-After`, 304 |
| 3 | Runner + O*NET adapter + loader | `--dry-run` prints about 1,016 and 5 samples; a real run fills `occupations` in Studio and adds an `import_runs` row; a second run ends "unchanged" |
| 4 | Circuit breaker and failure paths | Unit tests; a fixture with most rows broken aborts and leaves the table as it was |
| 5 | Workflow, freshness check, `pg_cron` purge, docs | Workflow passes `actionlint` if available; pgTAP for the purge; a manual run on GitHub only after the owner pushes the migration and adds the secret |

## Test plan
- Unit (Vitest): the O*NET parser against a saved 20-row copy of
  `occupation_data.csv` and a saved copy of the database page; politeness
  with a fake fetch and clock; the circuit breaker; env validation.
- Database (pgTAP): grants and RLS, the permission gate, merge (insert,
  update, delete, rollback on error), purge.
- By hand: dry run, real run, repeat run, and a stale `terms_checked_at`
  refusal, each checked in Studio.

## Open questions
- `IMPORT_CONTACT`: a Stepwell address (also `[CONTACT EMAIL]` in the legal
  drafts). Needed before the first scheduled run.
- Node 24 runs TypeScript directly, so no build step and no `tsx`. If the
  project's tsconfig makes that awkward, `tsx` is the fallback (decided in
  step 3).
- CC BY asks users to "indicate any modifications": Career Explorer's source
  line should say Stepwell shows a selection of O*NET data.
