# stepwell

Helps students connect careers to programs and colleges using official U.S. data.

Instructions for every AI coding agent working in this repo (Claude Code reads
this through CLAUDE.md; Antigravity, Copilot and Codex read it directly).

## Stack
- Next.js (App Router, `src/` directory) + TypeScript + Tailwind CSS
- Supabase for database, auth and storage (`src/lib/supabase/`)
- zod for validating settings and all input (`src/lib/env.ts`)
- Vitest for tests; ESLint for linting
- Hosting: Vercel (unless docs/ARCHITECTURE.md says otherwise)

## Commands
- `npm run dev`: local dev server at http://localhost:3000
- `npm run check`: lint + typecheck + tests. Run before saying work is done.
- `npm run build`: production build
- `npm test`: tests only
- `npm run award-sites:gaps -- TX`: research worklist for a state's local scholarship file (docs/tools.md)
- `npm run award-sites:check -- <url>`: vet one candidate scholarship link (no URL: check them all)
- `/award-sites-research`: skill for adding one state's local scholarship file
- If you repeat a manual step 3 times this session, offer /build-project-tool for it.

## Before building anything
1. Read `docs/PRODUCT.md` (what we're building and what we're NOT building).
2. For a new feature, read or write its spec in `docs/specs/` first (copy
   `docs/specs/TEMPLATE.md`). If there's no spec, propose one and wait for approval.
3. For UI work, follow `docs/design/DESIGN.md`. If it's still empty, propose a
   design direction first.

## Rules
- Secrets live in `.env.local` (never committed). Only variables prefixed
  `NEXT_PUBLIC_` may reach the browser, and those must never be secret.
- Every database table holding user data gets Row Level Security policies in
  the same migration that creates it (see the supabase-migration skill).
- Every new table in `public` also gets explicit `grant`s in that migration:
  Supabase stopped granting Data API access automatically on 2026-10-30.
- Check permissions on the server. Never trust a user ID sent from the browser.
- Validate all input on the server with zod.
- Record significant decisions in `docs/decisions/` (one short file each).
- Before deploying, run the pre-ship-security skill against `docs/SECURITY.md`.

## Layout
- `src/app/`: routes and pages
- `src/lib/`: shared code (Supabase clients, settings, helpers)
- `supabase/migrations/`: database changes (created by `npx supabase init`)
- `docs/`: product, architecture, security, design, decisions, specs

## About this app (Stepwell)
- A free web app that helps students (high school, college, and people
  considering further education) connect **careers → programs → colleges**
  using official U.S. government data. Full brief: `docs/PRODUCT.md`.
- **Users may be 13–17.** Minimum age is 13, asked at sign-up. Collect only
  what a feature needs; never add tracking, ads, or data sharing. See
  `docs/SECURITY.md` and `docs/decisions/0002-minimum-age-13.md`.
- **Government data is cached, never fetched per page view.** Scheduled jobs
  copy O*NET and College Scorecard data into our own Supabase tables; pages
  read our tables. Details: `docs/DATA_SOURCES.md`.
- Show a source line under any number we display (e.g. "Source: U.S. Dept. of
  Labor O*NET"); O*NET requires attribution.
- AI features (later phases) go through the Anthropic API from server code
  only, with per-user daily limits. Never call AI from the browser.

## Design rules (hard rules)
- All UI follows `docs/design/DESIGN.md` (chosen colors and fonts) and
  **never** uses anything listed in `docs/design/AVOID.md`. Read AVOID.md
  before any UI work and check the result against it before calling it done.
- The short version: no gradients, drop shadows, glassmorphism, glows, dot
  grids, pure-white backgrounds, purple/black or neon/pastel palettes; no
  3-card rows, bento grids, pricing tiers, or left color stripes; no Lucide
  icons, sparkles, emojis, checkmark bullets, or animated arrows; no Inter,
  Geist, or Space Grotesk; no hover animations; no em dashes, "It's not X,
  it's Y", or fake testimonials. Always: skeleton loaders, empty and error
  states, real product screenshots, Terms and Privacy pages.

## Security rules (hard rules)
- Every change touching login, data, APIs, files, or settings follows
  `docs/SECURITY.md` item by item. Key points: secrets only in env files;
  permissions checked on the server using the session's user (never a user
  ID from the browser); RLS on every table; zod validation on every server
  input; no `dangerouslySetInnerHTML`; friendly errors only; security
  headers set; rate limits on login, signup, and costly endpoints.
- Before calling such a change done, list which SECURITY.md items it touched
  and how each is satisfied.

## How we work on this project
1. Start each session by reading `docs/PROGRESS.md` (where we left off).
2. New feature: read its spec in `docs/specs/`. No spec: write one from
   `docs/specs/TEMPLATE.md` and wait for approval before coding.
3. Plan first (plan mode) for anything touching more than two files.
4. Done means: `npm run check` passes, the feature was tried in the browser,
   and the spec's acceptance criteria are ticked.
5. End each session: update `docs/PROGRESS.md` (what changed, what's next,
   open questions), then commit.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
