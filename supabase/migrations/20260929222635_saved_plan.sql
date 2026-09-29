-- Saved plan (docs/specs/saved-plan.md): students save scholarships and
-- colleges as well as careers, and keep their own year-by-year plan items.
-- Both tables are owner-only and deleted with the account (cascade).

-- Saved scholarships and colleges ---------------------------------------------
-- No foreign keys here, unlike onet_code: the daily merges delete scholarships
-- and colleges that leave the source, and a key would make those merges fail
-- (a cascade would silently drop the save). Instead the server checks the id
-- exists when saving and copies its title, so the plan can say "No longer
-- listed" by name.

alter table public.saved_items
  add column scholarship_id text
    constraint saved_items_scholarship_id_valid check (scholarship_id ~ '^[a-z]{2}-[a-z0-9-]{2,80}$'),
  add column unitid integer
    constraint saved_items_unitid_valid check (unitid > 0),
  add column title text
    constraint saved_items_title_valid check (char_length(title) between 1 and 300),
  add constraint saved_items_one_per_scholarship unique (user_id, scholarship_id),
  add constraint saved_items_one_per_college unique (user_id, unitid);

alter table public.saved_items drop constraint saved_items_exactly_one;
alter table public.saved_items
  add constraint saved_items_exactly_one check (num_nonnulls(onet_code, scholarship_id, unitid) = 1);

grant insert (onet_code, scholarship_id, unitid, title) on table public.saved_items to authenticated;

-- Plan items --------------------------------------------------------------------
-- A student's own entries. academic_year 2027 means the 2027 to 2028 school
-- year; null means no set year. No free-text notes in v1 (a 13-year-old's
-- notes are a privacy risk the plan doesn't need); the title is short.

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null constraint plan_items_title_valid check (char_length(btrim(title)) between 1 and 200),
  kind text not null default 'task' constraint plan_items_kind_valid check (kind in ('class', 'task', 'application')),
  academic_year smallint constraint plan_items_year_valid check (academic_year between 2000 and 2100),
  term text not null default 'full_year'
    constraint plan_items_term_valid check (term in ('fall', 'spring', 'summer', 'full_year')),
  due_on date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.plan_items is
  'A student''s own year-by-year plan entries. Owner-only; deleted with the account.';

create index plan_items_user_id_idx on public.plan_items (user_id);

alter table public.plan_items enable row level security;

create policy "Students read their own plan"
  on public.plan_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students add to their own plan"
  on public.plan_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Students change their own plan"
  on public.plan_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Students remove from their own plan"
  on public.plan_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- user_id always comes from auth.uid() and can't be sent or changed.
revoke all on table public.plan_items from anon, authenticated;
grant select, delete on table public.plan_items to authenticated;
grant insert (title, kind, academic_year, term, due_on),
      update (title, kind, academic_year, term, due_on, done)
  on table public.plan_items to authenticated;
