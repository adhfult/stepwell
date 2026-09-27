# Architecture: project-name

> Keep this current. Agents read it to understand how the pieces fit.

## Stack
| Layer | Choice | Where |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | `src/app/` |
| Styling | Tailwind CSS, tokens from `docs/design/DESIGN.md` | `src/app/globals.css` |
| Database, auth, storage | Supabase | `src/lib/supabase/`, `supabase/migrations/` |
| Validation | zod | `src/lib/env.ts`, route handlers, server actions |
| Tests | Vitest | `src/**/*.test.ts` |
| Hosting | Vercel | |

## How a request flows
1. `src/proxy.ts` runs first and refreshes the Supabase login session.
2. Server Components / Route Handlers / Server Actions use
   `src/lib/supabase/server.ts`, which acts as the signed-in user, so
   Row Level Security decides what they can see.
3. Client Components use `src/lib/supabase/client.ts` for browser-side calls
   (also limited by Row Level Security).

## Settings
| Variable | Public? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |

Add every new variable here and to `.env.example` (names only).

## Data model
Describe tables as they're added (name, purpose, who can read/write).

## External services and data sources
List APIs used, their limits, and required attribution.
