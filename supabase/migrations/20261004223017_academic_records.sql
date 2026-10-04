-- GPA and test scores (spec gpa-and-tests.md, decision 0013): one row per
-- student holding their classes, grades, school weights, a known-GPA
-- shortcut and SAT/ACT. Owner-only, consent-gated, deleted with the account
-- and after 12 months without a sign-in, like eligibility_profiles.

-- Every rule the form's zod schema has, so a direct Data API call can't skip it.
create function public.academic_courses_valid(p_courses jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_courses) = 'array'
     and jsonb_array_length(p_courses) <= 80
     and not exists (
       select from jsonb_array_elements(p_courses) e
       where jsonb_typeof(e) <> 'object'
          or (select array_agg(k order by k) from jsonb_object_keys(e) k) <> array['credits', 'grade', 'name', 'type']
          or jsonb_typeof(e -> 'name') <> 'string'
          or char_length(e ->> 'name') > 80
          or jsonb_typeof(e -> 'type') <> 'string'
          or e ->> 'type' not in ('regular', 'honors', 'ap', 'ib', 'dual')
          or (jsonb_typeof(e -> 'grade') <> 'null'
              and (jsonb_typeof(e -> 'grade') <> 'string'
                   or e ->> 'grade' not in ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')))
          or jsonb_typeof(e -> 'credits') <> 'number'
          or (e ->> 'credits')::numeric not between 0.5 and 5
          or (e ->> 'credits')::numeric % 0.5 <> 0
     )
$$;

create table public.academic_records (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- [{name, type, grade (null = not finished), credits}]
  courses jsonb not null default '[]' constraint academic_courses_valid check (public.academic_courses_valid(courses)),
  -- Bonus per class type; null = the default (honors 0.5, AP / IB / dual 1.0).
  weight_honors numeric(3, 2) constraint academic_weight_honors_valid check (weight_honors between 0 and 1),
  weight_ap numeric(3, 2) constraint academic_weight_ap_valid check (weight_ap between 0 and 1),
  weight_ib numeric(3, 2) constraint academic_weight_ib_valid check (weight_ib between 0 and 1),
  weight_dual numeric(3, 2) constraint academic_weight_dual_valid check (weight_dual between 0 and 1),
  -- "I already know my GPA": earlier classes as one entry.
  start_unweighted numeric(3, 2) constraint academic_start_unweighted_valid check (start_unweighted between 0 and 5),
  start_weighted numeric(3, 2) constraint academic_start_weighted_valid check (start_weighted between 0 and 5),
  start_credits numeric(4, 1) not null default 0 constraint academic_start_credits_valid check (start_credits between 0 and 80),
  sat smallint constraint academic_sat_valid check (sat between 400 and 1600 and sat % 10 = 0),
  act smallint constraint academic_act_valid check (act between 1 and 36),
  -- Which consent text the student agreed to; a newer version asks again.
  consent_version smallint not null constraint academic_consent_version_valid check (consent_version > 0),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.academic_records is
  'Classes, grades and test scores a student saved from /gpa (decision 0013). Owner-only; never logged; deleted with the account and after 12 months without a sign-in.';

alter table public.academic_records enable row level security;

create policy "Students read their own grades and scores"
  on public.academic_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students save their own grades and scores"
  on public.academic_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Students change their own grades and scores"
  on public.academic_records for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Students remove their own grades and scores"
  on public.academic_records for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.academic_records from anon, authenticated;
grant select, delete on table public.academic_records to authenticated;
grant insert (courses, weight_honors, weight_ap, weight_ib, weight_dual, start_unweighted, start_weighted, start_credits,
              sat, act, consent_version, consented_at),
      update (courses, weight_honors, weight_ap, weight_ib, weight_dual, start_unweighted, start_weighted, start_credits,
              sat, act, consent_version, consented_at)
  on table public.academic_records to authenticated;

create trigger academic_records_set_updated_at
  before update on public.academic_records
  for each row execute function public.set_updated_at();

-- Retention: grades and scores go after 12 months without a sign-in.
create function ingest.purge_stale_academic_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.academic_records a
  using auth.users u
  where u.id = a.user_id
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function ingest.purge_stale_academic_records() from public, anon, authenticated, service_role;

select cron.schedule('purge-stale-academic-records', '43 4 * * *', 'select ingest.purge_stale_academic_records()');
