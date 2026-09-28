# 0004: Delete accounts with a database function

- Date: 2026-09-27
- Status: accepted

## Context
SECURITY.md requires that account deletion removes all of a student's data,
and that the Supabase service-role key is used only by import jobs, never in
app code. Deleting a login (`auth.users` row) normally goes through Supabase's
admin API, which needs the service-role key.

## Decision
A narrow SQL function, `public.delete_my_account()`, deletes the caller's own
`auth.users` row; every table of student data references it with
`on delete cascade`, so everything else goes with it. The function:
- is `security definer` with `set search_path = ''`;
- raises an error if `auth.uid()` is null;
- deletes only `where id = auth.uid()`;
- has execute revoked from `public` and `anon` and granted to `authenticated`
  (Postgres lets everyone execute new functions by default).

The account page calls it after re-checking the session with `getUser()` and
the student's password, then clears the session cookies.

## Alternatives considered
- Admin API with the service-role key in a Server Action: puts the most
  powerful key in the web app's runtime, which SECURITY.md forbids.
- Mark the account for deletion and let a scheduled job delete it: the data
  stays around after the student asked for it to go, and it adds moving parts.
- A Supabase Edge Function holding the service-role key: another deployed
  service to secure and keep in sync.

## Consequences
- Relies on the `postgres` role being allowed to delete from `auth.users`; a
  pgTAP test checks this before the delete feature is built.
- A deleted account's access token stays valid until it expires (up to one
  hour). Pages treat "signed in but no profile row" as signed out, and the
  token can't create anything because its rows are gone.
- Any future table holding student data must reference `auth.users` (or
  `profiles`) with `on delete cascade`, or deletion leaves data behind.
