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
1. `src/proxy.ts` refreshes the Supabase login session.
2. Pages and server actions use `src/lib/supabase/server.ts`, which acts as the
   signed-in user, so Row Level Security decides what they can read or write.
3. Reference data (careers, colleges) is public-read; user data is owner-only.

## Data model
**Reference data** (public read, written only by import jobs):
| Table | Key | Contents |
|---|---|---|
| `occupations` | `soc_code` | title, description, typical education, pay, source date |
| `occupation_details` | `soc_code` | tasks, skills, knowledge (JSON) |
| `institutions` | `unitid` | name, city, state, cost, admission rate, grad rate |
| `programs` | `(unitid, cip_code, credential)` | program name, median debt, earnings |
| `occupation_program_map` | `(soc_code, cip_code)` | CIP–SOC crosswalk |

**User data** (owner-only via RLS):
| Table | Contents |
|---|---|
| `profiles` | user id, display name, education stage, state, grad year, age confirmed (no birthdate) |
| `interest_results` | Interest Profiler scores (six areas) |
| `saved_items` | saved careers and colleges |
| `plan_steps` | next steps with optional due dates and status |

## Data imports
- Jobs in `src/jobs/` fetch O*NET / Scorecard data and upsert into reference
  tables using the service-role key, **outside** the web app (run by a
  scheduler such as GitHub Actions or Supabase Cron). See `docs/DATA_SOURCES.md`.
- Each imported row stores `source` and `retrieved_at` for display and auditing.

## Settings
| Variable | Public? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key |
| `ONET_USERNAME`, `ONET_PASSWORD`, `SCORECARD_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | **no** | Import jobs only |

## Later
- AI advisor: server-side Anthropic API calls with tool use over our tables,
  per-user daily caps, and a spending limit (phase 2).
