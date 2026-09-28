# Architecture: Stepwell

> Keep this current. Agents read it to understand how the pieces fit.

## Stack
| Layer | Choice | Where |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | `src/app/` |
| Styling | Tailwind CSS, tokens from `docs/design/DESIGN.md` | `src/app/globals.css` |
| Database, auth | Supabase (Postgres + Auth), Row Level Security everywhere | `src/lib/supabase/`, `supabase/migrations/` |
| Validation | zod | `src/lib/env.ts`, server actions, route handlers |
| Data imports | Scheduled server-side jobs (see below) | `src/jobs/` |
| Tests | Vitest | `src/**/*.test.ts` |
| Hosting | Vercel | |

## How a request flows
1. `src/proxy.ts` refreshes the Supabase login session (`getClaims()`) and,
   with that quick token check, redirects signed-out visitors away from
   `/account` pages before they stream.
2. Pages and Server Actions ask the Data Access Layer (`src/lib/auth/dal.ts`)
   who is signed in: `getCurrentUser()` (verified token plus a profile row),
   `requireUser()` for protected pages, `getFreshUser()` (asks the Auth
   server) for sensitive actions, `signedInByEmailLinkRecently()` for setting
   a password. Never auth checks in layouts, never `getSession()` on the server.
3. Data access goes through `src/lib/supabase/server.ts`, which acts as the
   signed-in user, so Row Level Security decides what they can read or write.
4. Reference data (careers, colleges) is public-read; user data is owner-only.

## Local development
- Supabase runs locally in Docker: `npm run db:start` / `npm run db:stop`
  (unused services excluded). Emails land in Mailpit (127.0.0.1:54324).
- Migrations live in `supabase/migrations/` and are applied locally first;
  pgTAP tests in `supabase/tests/` run with `npm run test:db`. Changes reach
  the cloud project only with the owner's OK (`supabase db push`).

## Data model
Built tables are marked; the rest are planned in the approved v1 expansion
design (`docs/specs/v1-expansion-draft.md`, Section 2) and arrive with their
build step's spec.

**Reference data** (public read, written only by import jobs):
| Table | Key | Contents |
|---|---|---|
| `occupations` | `onet_code` (computed `soc_code`) | title, description, job zone, typical education, pay, outlook, interest scores, O*NET release |
| `occupation_titles`, `occupation_knowledge`, `occupation_details`, `occupation_related` | `onet_code` | search titles; knowledge ratings (joined for AP suggestions); tasks and skills (JSON); related careers |
| `interest_questions` | id | Interest Profiler questions, cached once |
| `institutions` | `unitid` | name, city, state, control, net price, admission and graduation rates |
| `programs` | `id` (unique `unitid, cip4, credential_level`) | median debt, earnings |
| `occupation_program_map` | `(soc_code, cip6)` + computed `cip4` | CIP–SOC crosswalk |
| `ap_courses`, `knowledge_ap_map` | code | AP course list and the knowledge-area mapping (hand-entered) |
| `sources` | id | every data source, its terms check and fetcher |
| `scholarships`, `scholarship_criteria`, `opportunities`, `listing_fields` | id | listings, their eligibility rules, CIP families |

**User data** (owner-only via RLS):
| Table | Contents |
|---|---|
| `profiles` (built) | user id, optional nickname, stage, state, expected graduation year, age confirmed (no birthdate). Created by `handle_new_user()` at sign-up, which refuses any sign-up without age confirmation; students may update only nickname, stage, state and year. `delete_my_account()` deletes the login and, by cascade, all of a student's rows (decision 0004). |
| `interest_results` | latest Interest Profiler scores (six areas) |
| `saved_items` | one link column per kind (career, college, program, scholarship, opportunity, AP course), exactly one set |
| `plan_items` | year-by-year plan: term, kind, title, due date, status; saved listings' deadlines read live |
| `eligibility_profiles` | optional scholarship answers after a two-step opt-in; matching stays in the database; deleted after 12 months without a sign-in (decision 0006) |

## Data imports
- One shared pipeline in `src/jobs/` with one adapter per source (v1 expansion
  draft, Section 3): fetch politely, validate with zod, stage in the `ingest`
  schema (not exposed to the Data API), then merge into `public` in one
  transaction; a circuit breaker stops a broken scraper from wiping data.
- Runs on a GitHub Actions schedule with the service-role key, **outside** the
  web app. Sources and the allowlist: `docs/DATA_SOURCES.md`; scraping rules:
  decision 0007.
- Each imported row stores its source and retrieval date for display and auditing.
- Retention jobs run inside Postgres with `pg_cron` (v1 expansion, Section 4.2).

## Settings
| Variable | Public? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Cloudflare Turnstile site key (unset locally = test key) |
| `ONET_API_KEY`, `SCORECARD_API_KEY`, CareerOneStop and USAJOBS keys, `CONTEXT_DEV_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | **no** | Import jobs only |
| `SUPABASE_AUTH_CAPTCHA_SECRET` | **no** | Supabase Auth only; the test secret is set by `npm run db:start` |

## Later
- AI advisor: server-side Anthropic API calls with tool use over our tables,
  per-user daily caps, and a spending limit (phase 2).
