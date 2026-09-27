# Security: project-name

Project-specific rules. The pre-ship-security skill combines these with the
global checklist before any deploy.

## Always
- Every table with user data has Row Level Security enabled and owner-only
  policies, created in the same migration as the table.
- Server code uses `src/lib/supabase/server.ts` (acts as the user). The
  service-role key is never used in this app; if a task truly needs it, it runs
  in a separate server-only job and gets a decision record first.
- Nothing secret uses the `NEXT_PUBLIC_` prefix.
- All input to Route Handlers and Server Actions is validated with zod.
- Rate-limit sign-up, sign-in, and any endpoint that costs money (e.g. AI calls).

## If this project collects personal data
- Publish a privacy policy and terms before launch, linked in the footer.
- Collect only what a feature needs; note each personal field in ARCHITECTURE.md.
- If users may be under 18, state a minimum age (13+) at sign-up and never
  sell or share their data.

## Project-specific
Add rules specific to this project here.
