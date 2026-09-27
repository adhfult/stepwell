---
name: supabase-migration
description: Create or change Supabase database tables in this project, always with Row Level Security. Use for any database change, including "add a table", "store X for each user", "add a column", "change the schema", "save this data", or when a feature needs to persist data, even if Supabase or migrations aren't mentioned.
---

# Supabase migrations with Row Level Security

Every schema change is a migration file in `supabase/migrations/`, and every
table that holds user data gets Row Level Security (RLS) in the same migration.
Without RLS, anyone with the public key can read the whole table.

## One-time setup (check first; skip what's done)
- `supabase/` folder missing: run `npx supabase init`.
- Not linked to the Supabase project: ask the user to run
  `npx supabase login` and `npx supabase link --project-ref <ref>` themselves
  (these involve signing in).

## Making a change
1. Create the file: `npx supabase migration new <short_snake_case_name>`.
2. Write the SQL. For a table owned by users:

   ```sql
   create table public.notes (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
     body text not null check (char_length(body) <= 5000),
     created_at timestamptz not null default now()
   );

   alter table public.notes enable row level security;

   create policy "Users read their own notes" on public.notes
     for select to authenticated using ((select auth.uid()) = user_id);
   create policy "Users add their own notes" on public.notes
     for insert to authenticated with check ((select auth.uid()) = user_id);
   create policy "Users update their own notes" on public.notes
     for update to authenticated using ((select auth.uid()) = user_id)
     with check ((select auth.uid()) = user_id);
   create policy "Users delete their own notes" on public.notes
     for delete to authenticated using ((select auth.uid()) = user_id);

   create index on public.notes (user_id);
   ```

   For shared reference data everyone may read (e.g. a list of careers):
   enable RLS and add only a `for select to anon, authenticated using (true)`
   policy. Writes then only happen through migrations or a separate admin job.

3. Explain the change and its policies to the user before applying it.
4. Apply it. `npx supabase db push` changes the real (linked) database, so
   ask the user first; prefer a development project over production.
5. Refresh TypeScript types:
   `npx supabase gen types typescript --linked > src/lib/database.types.ts`
6. Update the data model section of `docs/ARCHITECTURE.md`.

## Checks before finishing
- Every new table: `enable row level security` is present.
- No policy uses `using (true)` on user data.
- Columns users shouldn't set themselves (user_id, role, created_at) are
  filled by defaults, not accepted from the client.
- Never put the service-role key in app code or `NEXT_PUBLIC_` variables.
