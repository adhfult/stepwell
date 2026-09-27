# project-name

__PROJECT_DESCRIPTION__

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
- Check permissions on the server. Never trust a user ID sent from the browser.
- Validate all input on the server with zod.
- Record significant decisions in `docs/decisions/` (one short file each).
- Before deploying, run the pre-ship-security skill against `docs/SECURITY.md`.

## Layout
- `src/app/`: routes and pages
- `src/lib/`: shared code (Supabase clients, settings, helpers)
- `supabase/migrations/`: database changes (created by `npx supabase init`)
- `docs/`: product, architecture, security, design, decisions, specs

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
