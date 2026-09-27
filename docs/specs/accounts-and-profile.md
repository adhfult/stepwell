# Spec: Accounts and profile

- Status: draft (review, then change to "approved")

## Goal
Let a student create an account and a minimal profile, so saved careers and
plans belong to them.

## User story
As a student, I want to sign up quickly and tell the app my stage and state,
so its suggestions fit me.

## Acceptance criteria
- [ ] Sign up and sign in with email + password via Supabase Auth; sign out works.
- [ ] Sign-up requires ticking "I am 13 or older"; without it, sign-up is blocked
      with a friendly message.
- [ ] After first sign-in, a profile form asks: display name, education stage
      (high school / college / adult learner), state (dropdown), graduation
      year (optional). Validated with zod on the server.
- [ ] `profiles` table with RLS: users can read and update only their own row;
      row is created for new users; deleting the auth user deletes the profile.
- [ ] A "Delete my account" action removes the user and all their data.
- [ ] Pages behind sign-in redirect to sign-in when signed out.
- [ ] Works on a phone-width screen; loading, empty, and error states exist.
- [ ] `npm run check` passes; tests cover the profile validation schema.

## Data
`profiles (id uuid pk = auth.users.id, display_name text, stage text,
state char(2), grad_year int null, age_confirmed bool, created_at, updated_at)`.

## Edge cases and errors
Email already used; weak password (Supabase rules); unconfirmed email flow;
invalid state code; grad year out of range (1950–2040).

## Out of scope
Social logins, profile photos, parent/counselor accounts.

## Test plan
Unit tests for the zod schema. By hand: sign up, fill profile, sign out/in,
try reading another user's profile via the browser console (must fail), delete account.
