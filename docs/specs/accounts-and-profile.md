# Spec: Accounts and profile

- Status: built (2026-09-28; approved 2026-09-27)
- Updated 2026-09-27: reviewed against PRODUCT.md, ARCHITECTURE.md,
  SECURITY.md, DESIGN.md and AVOID.md and current Supabase and Next.js 16
  docs; includes fixes 1 and 3 from `docs/specs/v1-expansion-draft.md` and
  decisions 0004 and 0005.

## Goal
Let a student create an account and a small profile, so saved careers and
plans belong to them, get back in if they forget their password, and delete
everything whenever they want.

## User story
As a student, I want to sign up quickly and tell Stepwell my stage and state,
so its suggestions fit me, without handing over more about myself than it needs.

## Acceptance criteria

### Sign-up
- [x] Email and password sign-up through Supabase Auth, with email
      confirmation on. Passwords are 8 to 72 characters.
- [x] Sign-up asks "What month and year were you born?" with no mention of an
      age limit. Both menus start empty (never on a real month or year). The
      server works out whether the person is 13 or older; the month and year
      are never stored or logged. Someone born in the current month 13 years
      ago counts as under 13, since no day is asked. (Decision 0005.)
- [x] Under 13: a kind message that doesn't say how to get in ("Sorry, we
      can't create an account for you. You can still explore careers without
      one."). A session-only cookie (no personal data) keeps showing that
      message if they try again in the same browser session.
- [x] After sign-up the page says "Check your email", the same message whether
      or not the address already has an account (no account lookups by email).
- [x] The database itself refuses to create an account unless age was
      confirmed (trigger), even if someone calls Supabase Auth directly.

### Email confirmation
- [x] The confirmation email links to `/auth/confirm`, a page with a
      "Confirm my email" button. (School email scanners such as Microsoft
      Safe Links open links automatically and would use up a one-time link.)
- [x] After confirming, the student is signed in and lands on the profile form.
- [x] An expired or already-used link shows a friendly message: sign in if
      you've already confirmed; otherwise sign up again with the same email
      to get a new link.

### Sign-in and sign-out
- [x] Sign in with email and password. Wrong details show "Email or password
      is wrong." An unconfirmed account shows "Confirm your email first",
      with the same tip about getting a new link.
- [x] After sign-in, the student returns to the page they came from (`next`),
      but only if it is a Stepwell page; otherwise the home page.
- [x] Sign-out is a button (a form that posts), not a link, and clears the session.

### Protected pages
- [x] `/account` and everything under it require sign-in; signed-out visitors
      go to `/sign-in?next=<that page>`.
- [x] Auth checks live in one server-only Data Access Layer
      (`src/lib/auth/dal.ts`): `getClaims()` for pages, `getUser()` for
      sensitive actions (delete account, set password). Never `getSession()`
      on the server. `src/proxy.ts` refreshes the session and, with a quick
      token check, redirects signed-out visitors away from `/account` pages
      before they stream (a real 307 instead of an in-page redirect); the
      page's `requireUser()` is still the check that protects data.
- [x] Signed in but no profile row counts as signed out (covers a deleted
      account whose old login token is still valid for up to an hour).

### Profile
- [x] The profile form asks:
  - nickname, optional ("What should we call you? A first name or nickname is fine."), up to 40 characters;
  - stage: middle school, high school, college, or adult learner;
  - state: a menu of the 50 states, DC, and five territories (PR, GU, VI, AS, MP);
  - expected graduation year, optional, and hidden for adult learners (see Data).
- [x] Validated with zod on the server, and again by database checks.
- [x] "Profile complete" means stage and state are set. Until then `/account`
      shows a "Finish your profile" empty state. No other page is blocked.
- [x] The student can edit the profile later; saving shows "Profile saved".

### Forgot and reset password
- [x] "Forgot password" sends a reset email and shows the same message for
      every address.
- [x] The reset link goes to the same button page as confirmation, then to
      "Set a new password". The old password stops working.

### Delete account
- [x] `/account/delete` explains what will be deleted and asks for the
      password, checked on the server.
- [x] Deleting calls `delete_my_account()` (decision 0004): the login and,
      through cascades, every row of the student's data are removed. Then the
      session is cleared and a "Your account is deleted" page is shown.

### Everywhere
- [x] Every redirect target taken from a URL or form goes through one
      `safeNextPath()` helper: only paths that start with `/` and not with
      `//` or `/\`.
- [x] Security headers in `next.config.ts`: `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `X-Frame-Options: DENY`, a `Permissions-Policy` that turns off camera,
      microphone and location, and a CSP of `frame-ancestors 'none';
      base-uri 'self'; form-action 'self'; object-src 'none'`. (A full CSP
      comes later.)
- [x] UI follows `docs/design/DESIGN.md` and never uses anything in
      `docs/design/AVOID.md`: form pattern (label above, 44px fields,
      "Error:" messages, an error summary that takes focus), site header,
      skeleton, empty and error states, a designed not-found page. Forms keep
      what was typed after an error (never the password). Works at 320px.
- [x] No links to Terms or Privacy until those pages exist (no broken links).
- [x] `npm run check` and `npm run test:db` pass.

## Data
Table `public.profiles` (one row per account, created by a trigger):

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` primary key | references `auth.users (id) on delete cascade` |
| `nickname` | `text`, null | at most 40 characters, no control characters |
| `stage` | `text`, null | one of `middle_school`, `high_school`, `college`, `adult_learner` |
| `state` | `text`, null | one of the 56 codes above |
| `grad_year` | `smallint`, null | between 1950 and 2040 |
| `age_confirmed` | `boolean not null` | must be true |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | kept current by a trigger |

- `stage` and `state` may be empty in the database because the row exists
  before the student fills in the form; the form requires them.
- Expected graduation year means: middle or high school, the year you expect
  to finish high school; college, the year you expect to finish your degree;
  adult learner, not asked (cleared if the stage changes to adult learner).
  The form allows this year minus 1 to this year plus 8; the database check
  is the wider backstop.
- Access:
  - Row Level Security on. Policies let a signed-in student select and update
    only their own row (`(select auth.uid()) = id`; update has both `using`
    and `with check`).
  - Grants: `revoke all` from `anon` and `authenticated`, then grant
    `authenticated` only `select` and `update (nickname, stage, state,
    grad_year)`. No insert or delete grants: the trigger creates rows and
    account deletion removes them. The app updates with
    `update().eq('id', user.id)`, never upsert.
  - Every zod rule is repeated as a database check, because a signed-in
    student can send requests to Supabase's API directly and skip our forms.
- `public.handle_new_user()`: `security definer`, `set search_path = ''`,
  runs after insert on `auth.users`. It raises an error (blocking the
  sign-up) unless `raw_user_meta_data->>'age_confirmed' = 'true'`, and
  copies it into `profiles` once. The sign-up action sets it only after the
  age check passes. Later edits to user metadata never touch the profile.
- `public.delete_my_account()`: `security definer`, `set search_path = ''`,
  raises if `auth.uid()` is null, deletes only that user from `auth.users`.
  Execute revoked from `public` and `anon`, granted to `authenticated`.
- Never stored: birth month or year, real names, anything else about the student.

## Edge cases and errors
- Email already has an account: the same "Check your email" message.
- Signing in before confirming: "Confirm your email first".
- Expired or used email link: the friendly message above.
- Password shorter than 8 or longer than 72 characters: a field error.
- Under 13: the kind message, repeated on retry in the same session.
- Tampered form values (such as state `ZZ` or an unknown stage): a friendly
  field error; the database checks reject anything sent around the form.
- `next` pointing off-site: ignored; go to the home page.
- A deleted account's old token: treated as signed out; it can't create
  anything (the profile and login rows are gone).
- Stage changed to adult learner: expected graduation year cleared.
- Supabase unreachable: an error state saying so in plain words, with "Try again".
- Double-clicking submit: the button shows "Working" (for example "Creating
  account") and is not pressed twice.

## Out of scope
Social logins, profile photos, parent or counselor accounts, changing the
email address, two-factor sign-in, and the Terms and Privacy pages (their own
spec; see Launch blockers).

## Test plan
Automated:
- Unit tests (Vitest): sign-up, sign-in and profile schemas; `isAtLeast13()`
  edge cases (this month, last month, 13 years ago); `safeNextPath()`
  (rejects `//evil.com`, `/\evil.com`, `https://...`, `javascript:`);
  Supabase error to message mapping.
- Database tests (pgTAP, `npm run test:db` against the local Supabase):
  sign-up without age confirmation is refused; `anon` can't read profiles;
  student A can't read or update student B; `age_confirmed` and `id` can't be
  updated; insert and delete are denied; bad stage, state, nickname and year
  values are rejected; `delete_my_account()` deletes only the caller and
  can't be run by `anon`.

By hand, at 320px and desktop width, with the local Supabase and Mailpit:
sign up (under-13 and 13+ paths), confirm, fill the profile, sign out and in,
reset the password, delete the account. With two accounts, use account A's
token with curl against the local REST API to read and change B's profile
and A's own `age_confirmed`: every attempt must fail. Then check the pages
against AVOID.md line by line.

## Build steps
Small steps, each checked in the browser at `localhost:3000` (never
127.0.0.1: login cookies belong to one host name) and committed on its own.

1. Local Supabase running (Docker, `npx supabase start`); `config.toml` auth
   settings: site URL and redirect URLs on `http://localhost:3000`, email
   confirmation on, minimum password length 8.
2. `profiles` migration with trigger, RLS, grants and checks; pgTAP tests;
   generated types in `src/lib/database.types.ts`.
3. Security headers.
4. Site header (Data Access Layer `getCurrentUser`) and the not-found page.
5. Sign-up form with validation only; then connected to Supabase.
6. Email confirmation page and template.
7. Sign-in.
8. Protected `/account` and sign-out; `proxy.ts` switches to `getClaims()`.
9. Profile form.
10. Account page shows the profile.
11. Delete account (`delete_my_account()` migration and tests).
12. Forgot password; set a new password.
12b. Mobile polish pass (added 2026-09-27: the owner found phone layouts
    cluttered): every account page reviewed and tidied at 320-390px with a
    real phone-sized browser, not only checked for sideways scrolling.
13. Docs (ARCHITECTURE.md, SECURITY.md, the supabase-migration skill), final
    walkthrough, AVOID.md check.

## Open questions
- What happens to accounts that are never confirmed (delete after some days?).
- ~~Auth rate limits are per IP address.~~ Decided 2026-09-29 in
  `docs/decisions/0009-auth-rate-limits.md`: Vercel Firewall limits per
  visitor IP, Turnstile stays at Supabase, Supabase's shared limit raised.

## Launch blockers (before any real student signs up)
Step by step in `docs/LAUNCH.md`; Terms and Privacy in `docs/specs/legal-pages.md`.
- ~~Sign-up bot protection.~~ Done 2026-09-28: Cloudflare Turnstile on sign-up,
  sign-in, password reset and the delete password check (Supabase requires
  the token for all of them). Real keys still needed: docs/LAUNCH.md.
- Terms and Privacy pages, linked from sign-up and the footer.
- Custom email sending for the cloud project (the built-in service only
  sends to project team members, 2 emails an hour).
- ~~A full Content-Security-Policy.~~ Done 2026-09-28 (nonce-based, `src/proxy.ts`).
- A separate production Supabase project; migrations and auth settings pushed
  to it only with the owner's OK.
- Legal review of the age screen and data practices (decision 0002, 0005).
