-- Scholarships: a curated list of official state and federal programs, the
-- optional eligibility answers (decision 0006, first question set only), and
-- matching inside the database. Spec: docs/specs/scholarships.md.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'official_list',
  'Official scholarship and grant programs (curated)',
  'manual',
  'https://studentaid.gov/understand-aid/types/grants',
  null,
  '2026-09-28',
  true,
  interval '1 day',
  'Programs listed from their official state and federal government pages; each listing links to its source and says when Stepwell last checked it.'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution', 'scholarship')
  );

-- Listings ---------------------------------------------------------------------
-- The rules are columns (not a separate criteria table): the rule set is
-- small and fixed, which keeps matching one readable query.

create table public.scholarships (
  id text primary key constraint scholarships_id_valid check (id ~ '^[a-z]{2}-[a-z0-9-]{2,80}$'),
  title text not null constraint scholarships_title_valid check (char_length(title) between 1 and 200),
  sponsor text not null constraint scholarships_sponsor_valid check (char_length(sponsor) between 1 and 200),
  sponsor_type text not null constraint scholarships_sponsor_type_valid check (sponsor_type in ('federal', 'state')),
  url text not null constraint scholarships_url_valid check (url ~ '^https://[^\s]+$'),
  award_min integer constraint scholarships_award_min_valid check (award_min > 0),
  award_max integer constraint scholarships_award_max_valid check (award_max > 0),
  award_text text constraint scholarships_award_text_valid check (char_length(award_text) <= 120),
  -- date (deadline_date), usually (deadline_month_day, e.g. "03-02"), rolling, unknown.
  deadline_kind text not null
    constraint scholarships_deadline_kind_valid check (deadline_kind in ('date', 'usually', 'rolling', 'unknown')),
  deadline_date date,
  deadline_month_day text constraint scholarships_deadline_month_day_valid check (deadline_month_day ~ '^\d{2}-\d{2}$'),
  -- Who can apply: high_school, college (undergraduates), graduate, adult.
  stages text[] not null
    constraint scholarships_stages_valid check (
      cardinality(stages) > 0 and stages <@ array['high_school', 'college', 'graduate', 'adult']
    ),
  -- Rules. Empty means no rule.
  state text constraint scholarships_state_valid check (state ~ '^[A-Z]{2}$'),
  min_gpa numeric(3, 2) constraint scholarships_min_gpa_valid check (min_gpa between 0 and 5),
  fields text[] not null default '{}'
    constraint scholarships_fields_valid check (array_to_string(fields, ',') ~ '^(\d{2}(,\d{2})*)?$'),
  citizenship text
    constraint scholarships_citizenship_valid check (citizenship in ('citizen', 'citizen_or_eligible_noncitizen')),
  first_generation boolean not null default false,
  military_family boolean not null default false,
  needs_fafsa boolean not null default false,
  -- Anything Stepwell doesn't ask about; such listings are "might qualify" at best.
  other_requirements text constraint scholarships_other_valid check (char_length(other_requirements) <= 420),
  description text not null constraint scholarships_description_valid check (char_length(description) between 1 and 500),
  checked_at date not null,
  source_id text not null default 'official_list' references public.sources (id),
  retrieved_at timestamptz not null,
  constraint scholarships_deadline_fields check (
    (deadline_kind = 'date') = (deadline_date is not null)
    and (deadline_kind = 'usually') = (deadline_month_day is not null)
  ),
  constraint scholarships_federal_no_state check (sponsor_type = 'state' or state is null)
);

create index scholarships_state on public.scholarships (state);

alter table public.scholarships enable row level security;
create policy "Anyone can read scholarships" on public.scholarships for select to anon, authenticated using (true);
revoke all on table public.scholarships from anon, authenticated;
grant select on table public.scholarships to anon, authenticated;

-- Replaces the whole list in one transaction (it's a small, curated set).
create function ingest.merge_scholarships(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
  v_changed integer;
  v_removed integer;
begin
  if not exists (
    select from ingest.import_runs r
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'official_list'
  ) then
    raise exception 'Run % is not a running official list run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(
         id text, title text, sponsor text, sponsor_type text, url text,
         award_min integer, award_max integer, award_text text,
         deadline_kind text, deadline_date date, deadline_month_day text, stages text[],
         state text, min_gpa numeric, fields text[], citizenship text,
         first_generation boolean, military_family boolean, needs_fafsa boolean,
         other_requirements text, description text, checked_at date
       )
  where s.run_id = p_run_id and s.kind = 'scholarship' and s.status = 'valid';

  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero scholarships';
  end if;

  select count(*) into v_added
  from pg_temp.incoming i where not exists (select from public.scholarships s where s.id = i.id);
  select count(*) into v_changed
  from pg_temp.incoming i join public.scholarships s on s.id = i.id
  where (s.title, s.url, s.award_text, s.deadline_date, s.deadline_month_day, s.description, s.checked_at)
        is distinct from (i.title, i.url, i.award_text, i.deadline_date, i.deadline_month_day, i.description, i.checked_at);

  delete from public.scholarships s where not exists (select from pg_temp.incoming i where i.id = s.id);
  get diagnostics v_removed = row_count;

  insert into public.scholarships (
    id, title, sponsor, sponsor_type, url, award_min, award_max, award_text,
    deadline_kind, deadline_date, deadline_month_day, stages, state, min_gpa, fields, citizenship,
    first_generation, military_family, needs_fafsa, other_requirements, description, checked_at,
    source_id, retrieved_at
  )
  select
    i.id, i.title, i.sponsor, i.sponsor_type, i.url, i.award_min, i.award_max, i.award_text,
    i.deadline_kind, i.deadline_date, i.deadline_month_day, i.stages, i.state, i.min_gpa,
    coalesce(i.fields, '{}'), i.citizenship, coalesce(i.first_generation, false),
    coalesce(i.military_family, false), coalesce(i.needs_fafsa, false), i.other_requirements,
    i.description, i.checked_at, 'official_list', now()
  from pg_temp.incoming i
  on conflict (id) do update
  set title = excluded.title, sponsor = excluded.sponsor, sponsor_type = excluded.sponsor_type,
      url = excluded.url, award_min = excluded.award_min, award_max = excluded.award_max,
      award_text = excluded.award_text, deadline_kind = excluded.deadline_kind,
      deadline_date = excluded.deadline_date, deadline_month_day = excluded.deadline_month_day,
      stages = excluded.stages, state = excluded.state, min_gpa = excluded.min_gpa,
      fields = excluded.fields, citizenship = excluded.citizenship,
      first_generation = excluded.first_generation, military_family = excluded.military_family,
      needs_fafsa = excluded.needs_fafsa, other_requirements = excluded.other_requirements,
      description = excluded.description, checked_at = excluded.checked_at,
      retrieved_at = excluded.retrieved_at;

  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_scholarships(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_scholarships(bigint) to importer;

-- Eligibility answers (user data: owner-only; decision 0006) --------------------
-- Only the first question set. A row exists only after the student opts in;
-- every answer is optional (empty = not answered or "Prefer not to say").

create table public.eligibility_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  gpa numeric(3, 2) constraint eligibility_gpa_valid check (gpa between 0 and 5),
  -- Planned fields of study as 2-digit CIP families.
  intended_fields text[]
    constraint eligibility_fields_valid check (
      cardinality(intended_fields) <= 5 and array_to_string(intended_fields, ',') ~ '^(\d{2}(,\d{2})*)?$'
    ),
  first_generation text constraint eligibility_first_generation_valid check (first_generation in ('yes', 'no')),
  citizenship text
    constraint eligibility_citizenship_valid check (citizenship in ('citizen', 'eligible_noncitizen', 'other')),
  military_family text constraint eligibility_military_family_valid check (military_family in ('yes', 'no')),
  plans_fafsa text constraint eligibility_plans_fafsa_valid check (plans_fafsa in ('yes', 'no', 'unsure')),
  -- Which consent text the student agreed to; a newer version asks again.
  consent_version smallint not null constraint eligibility_consent_version_valid check (consent_version > 0),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.eligibility_profiles is
  'Optional scholarship eligibility answers (decision 0006). Owner-only; never logged; deleted with the account and after 12 months without a sign-in.';

alter table public.eligibility_profiles enable row level security;

create policy "Students read their own eligibility answers"
  on public.eligibility_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students opt in for themselves"
  on public.eligibility_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Students change their own eligibility answers"
  on public.eligibility_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Students remove their own eligibility answers"
  on public.eligibility_profiles for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.eligibility_profiles from anon, authenticated;
grant select, delete on table public.eligibility_profiles to authenticated;
grant insert (gpa, intended_fields, first_generation, citizenship, military_family, plans_fafsa, consent_version, consented_at),
      update (gpa, intended_fields, first_generation, citizenship, military_family, plans_fafsa, consent_version, consented_at)
  on table public.eligibility_profiles to authenticated;

create trigger eligibility_profiles_set_updated_at
  before update on public.eligibility_profiles
  for each row execute function public.set_updated_at();

-- Retention (Section 4.2): answers go after 12 months without a sign-in.
create function ingest.purge_stale_eligibility()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.eligibility_profiles e
  using auth.users u
  where u.id = e.user_id
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function ingest.purge_stale_eligibility() from public, anon, authenticated, service_role;

select cron.schedule('purge-stale-eligibility', '41 4 * * *', 'select ingest.purge_stale_eligibility()');

-- Matching -----------------------------------------------------------------------
-- Runs as the caller (security invoker), so it can only read the caller's own
-- eligibility row. Without a row, listings come back unrated ('open').
-- A rule an answer fails hides the listing; a rule with no answer (or an
-- "other" requirement) makes it "might"; otherwise "qualify".

create function public.match_scholarships(p_state text default null, p_stage text default null)
returns table (
  id text, title text, sponsor text, sponsor_type text, url text,
  award_min integer, award_max integer, award_text text,
  deadline_kind text, deadline_date date, deadline_month_day text,
  description text, checked_at date, fields text[], match text, to_check text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  e public.eligibility_profiles;
  v_has_answers boolean;
begin
  if p_state is not null and p_state !~ '^[A-Z]{2}$' then
    raise exception 'State must be a two-letter code';
  end if;
  if p_stage is not null and p_stage not in ('middle_school', 'high_school', 'college', 'adult_learner') then
    raise exception 'Unknown stage';
  end if;

  -- Signed-out visitors can't read eligibility_profiles at all, so only look
  -- when there is a signed-in student.
  v_has_answers := false;
  if (select auth.uid()) is not null then
    select * into e from public.eligibility_profiles p where p.user_id = (select auth.uid());
    v_has_answers := found;
  end if;

  return query
  with listed as (
    select s.*,
      -- Each rule: 'ok', 'fail' or a plain-words thing to check.
      array[
        case when s.min_gpa is null then 'ok'
             when e.gpa is null then format('A GPA of at least %s', to_char(s.min_gpa, 'FM0.09'))
             when e.gpa >= s.min_gpa then 'ok' else 'fail' end,
        case when cardinality(s.fields) = 0 then 'ok'
             when coalesce(cardinality(e.intended_fields), 0) = 0 then 'Your planned field of study'
             when s.fields && e.intended_fields then 'ok' else 'fail' end,
        case when s.citizenship is null then 'ok'
             when e.citizenship is null then 'Citizenship or immigration status'
             when e.citizenship = 'citizen' then 'ok'
             when e.citizenship = 'eligible_noncitizen' and s.citizenship = 'citizen_or_eligible_noncitizen' then 'ok'
             else 'fail' end,
        case when not s.first_generation then 'ok'
             when e.first_generation is null then 'Being the first in your family to go to college'
             when e.first_generation = 'yes' then 'ok' else 'fail' end,
        case when not s.military_family then 'ok'
             when e.military_family is null then 'A parent or guardian who served in the military'
             when e.military_family = 'yes' then 'ok' else 'fail' end,
        case when not s.needs_fafsa then 'ok'
             when e.plans_fafsa = 'yes' then 'ok'
             else 'Filing the FAFSA (or your state''s aid application)' end,
        case when s.other_requirements is null then 'ok' else s.other_requirements end
      ] as checks
    from public.scholarships s
    where (p_state is null or s.state is null or s.state = p_state)
      and (
        p_stage is null
        or (p_stage in ('middle_school', 'high_school') and 'high_school' = any (s.stages))
        or (p_stage = 'college' and 'college' = any (s.stages))
        or (p_stage = 'adult_learner' and s.stages && array['college', 'adult'])
      )
  )
  select
    l.id, l.title, l.sponsor, l.sponsor_type, l.url, l.award_min, l.award_max, l.award_text,
    l.deadline_kind, l.deadline_date, l.deadline_month_day, l.description, l.checked_at, l.fields,
    case when not v_has_answers then 'open'
         when array_remove(l.checks, 'ok') = '{}' then 'qualify'
         else 'might' end,
    array_remove(l.checks, 'ok')
  from listed l
  where not (v_has_answers and 'fail' = any (l.checks))
  order by
    case when not v_has_answers then 0 when array_remove(l.checks, 'ok') = '{}' then 0 else 1 end,
    -- Past deadlines last; then soonest first.
    (l.deadline_kind = 'date' and l.deadline_date < current_date),
    l.deadline_date nulls last,
    l.title;
end;
$$;

revoke execute on function public.match_scholarships(text, text) from public;
grant execute on function public.match_scholarships(text, text) to anon, authenticated;
