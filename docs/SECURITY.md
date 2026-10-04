# Stepwell security checklist

**Hard rules.** Every change that touches login, data, APIs, files, or
settings must follow them, and the pre-ship-security skill checks all of them
before any deploy. Stepwell's users may be 13–17, so privacy mistakes matter more.

Each item says **how Stepwell does it**.

## Secrets and keys
- [ ] **Secure API keys.** Server-only keys (any AI key) live in
      `.env.local` and in Vercel environment variables, never in code, never
      with `NEXT_PUBLIC_`. Import-job secrets (`IMPORT_DATABASE_URL`,
      `ONET_API_KEY`, `SCORECARD_API_KEY`, ...) live only in GitHub Actions
      secrets.
- [ ] **Hide all .env files.** `.gitignore` blocks `.env*` except `.env.example`;
      the pre-commit hook blocks real `.env` files; Claude can't read them.
- [ ] **Never hardcode secrets.** No keys, passwords, or tokens in source,
      tests, docs, or commit messages. `.env.example` holds names only.
- [ ] **Check Git history for secrets.** gitleaks runs on every commit
      (hook) and every push (CI). A leaked key is **rotated** in its
      dashboard, not just deleted from code.
- [ ] Vercel: production keys are set only for the Production environment;
      previews use a separate development Supabase project.

## Login and permissions
- [ ] **Add authentication.** Supabase Auth (email + password, email
      confirmation on). No home-made password handling.
- [ ] **Rate-limit login and signup.** Supabase Auth rate limits stay on;
      any custom endpoint that sends email or costs money gets its own limit.
      Cloudflare Turnstile (a bot check, usually invisible) guards sign-up,
      sign-in and password reset at the Supabase Auth level, so bots calling
      Supabase directly are refused too.
- [ ] **Verify permissions server-side.** Every page, Server Action and
      Route Handler gets the user from the Data Access Layer
      (`src/lib/auth/dal.ts`): `getClaims()` (verified token) for pages,
      `getUser()` (asks the Auth server) for sensitive actions, never
      `getSession()`. Then it checks what they may do. Hiding a button is not
      a permission check.
- [ ] **Don't trust frontend user IDs.** Never accept `user_id` from the
      browser; the server and RLS use the session's user.
- [ ] **Protect admin routes.** Stepwell has no admin pages in version 1.
      If added, they require a server-side role check and a decision record.
- [ ] Sensitive actions (delete account, change email) re-check the session
      and ask for confirmation.
      Known limit (accepted 2026-09-30): the email-link rule for a new
      password lives in the app, and Supabase lets a session under 24 hours
      old change its password through the Auth API directly. Someone with a
      copied login cookie could use that, but the cookie already gives them
      the account; cookies are HttpOnly, and students should sign out on
      shared computers.

## Data and database
- [ ] **Isolate user data.** Every table with user data has RLS with
      owner-only policies, in the same migration that creates it.
- [ ] **Lock down your database.** RLS enabled on **every** table in the
      public schema, including reference tables (public read only); no
      `using (true)` on user data; users can't write `user_id`, `role`, or
      timestamps directly.
- [ ] **Secure Firebase, Supabase, and storage.** No Firebase. Supabase:
      the service-role key is used nowhere: import jobs log in as the
      `importer` role, which can only call the `ingest` functions (decision
      0008), and nothing outside `src/jobs` may import job code (ESLint);
      storage buckets private by
      default with owner-only policies; Auth redirect URLs restricted to
      Stepwell's own domains; leaked-password protection on if available
      (it's Pro plan only, so not available on the free plan).
- [ ] **Prevent SQL and NoSQL injection.** Only the Supabase client or
      parameterized queries; never build SQL from strings with user input.
- [ ] Account deletion removes all of that user's data (cascade from auth.users).
- [ ] Minimum data: no birthdates, addresses, phone numbers, or school IDs.

## Input and output
- [ ] **Validate inputs server-side.** zod schemas on every Server Action,
      Route Handler, and search parameter, even if the browser validated too.
- [ ] **Sanitize user content.** React escapes text by default; never use
      `dangerouslySetInnerHTML` with user or imported content.
- [ ] **Secure file uploads.** None in version 1. If added: type and size
      checked on the server, private bucket, never served as HTML.
- [ ] **Hide detailed errors.** Users see a friendly message; details go to
      server logs only (never tokens, emails, or personal data in logs).
- [ ] Links from users or data use safe URLs only (no `javascript:`), and
      redirects only go to Stepwell's own pages.

## Deployment and configuration
- [ ] **Disable production debug mode.** No debug routes, test pages, or
      verbose logging in production; `console.log` of user data removed.
- [ ] **Add security headers and restrict CORS.** Set in `next.config.ts`:
      Content-Security-Policy, X-Content-Type-Options, Referrer-Policy,
      frame protection (`frame-ancestors 'none'`), Permissions-Policy.
      No wildcard CORS; API routes serve Stepwell's own pages only.
      (Now set. The CSP is sent per request from `src/proxy.ts` with a fresh
      nonce: only Next.js's own nonce-stamped scripts run. Development adds
      `'unsafe-eval'` and Next's dev tools trip style warnings; production
      builds have neither, checked with zero violations on every page.)
- [ ] HTTPS only (Vercel default).
- [ ] Dependencies: Dependabot updates merged when CI is green;
      `npm audit` shows no critical issues.

## Privacy (because users may be 13–17)
- [x] **Scholarship eligibility answers** (decision 0006): only after a
      separate opt-in with consent; every question optional; owner-only RLS
      with column grants; matching runs in the database as the student;
      never logged (errors log only database codes); "Remove my answers";
      deleted with the account and after 12 months without a sign-in
      (pg_cron). The Privacy draft describes them.
- [x] **Saved classes, grades and test scores** (decision 0013): saved only
      after a consent tick; owner-only RLS with column grants; a check
      function repeats every zod rule; session from `getCurrentUser()`,
      `user_id` from `auth.uid()`; never logged; "Remove my grades and
      scores"; deleted with the account and after 12 months without a
      sign-in. Signed-out drafts stay in the browser and are validated
      before use. The Privacy page describes them.
- [ ] Minimum age 13, checked at sign-up with a neutral birth month and year
      question that is never stored (decision 0005); only `age_confirmed` is
      stored, and the sign-up trigger refuses accounts without it.
- [ ] No ads, no third-party tracking, no selling or sharing data, including
      with colleges. Error tracking (e.g. Sentry) sends no personal data.
- [ ] Terms of Service and Privacy Policy linked in the footer before launch.

## Accounts that protect Stepwell
- [ ] Two-factor authentication on GitHub, Supabase, Vercel, and the domain registrar.
- [ ] Keys and passwords stored in a password manager (1Password via the
      Student Pack), never in chats, notes apps, or email.

## Before every launch or major release
- [ ] **Test as an untrusted user.** Sign in as a second test account and
      try to read or change the first account's data (profile, saved items)
      from the browser console and with direct requests. Every attempt must fail.
- [ ] Run the pre-ship-security skill ("Is this ready to deploy?").
- [ ] Before the first public launch, also run the full Cloudflare
      security-audit skill and fix all confirmed findings.
