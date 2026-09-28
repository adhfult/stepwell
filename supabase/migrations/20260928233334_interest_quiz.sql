-- Interest quiz: career interest scores, the quiz questions, students'
-- saved results, and career matching.
-- Spec: docs/specs/interest-quiz.md. v1 expansion, Sections 2.3 and 2.7.

-- Each career's six O*NET interest scores (RIASEC, 1 to 7; scale "OI" in
-- career_interest_types.csv). Empty for careers O*NET hasn't rated.
alter table public.occupations
  add column interest_realistic numeric(3, 2)
    constraint occupations_interest_realistic_valid check (interest_realistic between 1 and 7),
  add column interest_investigative numeric(3, 2)
    constraint occupations_interest_investigative_valid check (interest_investigative between 1 and 7),
  add column interest_artistic numeric(3, 2)
    constraint occupations_interest_artistic_valid check (interest_artistic between 1 and 7),
  add column interest_social numeric(3, 2)
    constraint occupations_interest_social_valid check (interest_social between 1 and 7),
  add column interest_enterprising numeric(3, 2)
    constraint occupations_interest_enterprising_valid check (interest_enterprising between 1 and 7),
  add column interest_conventional numeric(3, 2)
    constraint occupations_interest_conventional_valid check (interest_conventional between 1 and 7);

-- The O*NET merge now also copies the interest scores.
create or replace function ingest.merge_occupations(p_run_id bigint, p_release text)
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
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'onet'
  ) then
    raise exception 'Run % is not a running O*NET run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select
    s.payload ->> 'onet_code' as onet_code,
    s.payload ->> 'title' as title,
    s.payload ->> 'description' as description,
    (s.payload ->> 'job_zone')::smallint as job_zone,
    (s.payload ->> 'education_level')::smallint as education_level,
    (s.payload ->> 'education_share')::smallint as education_share,
    (s.payload ->> 'interest_realistic')::numeric as interest_realistic,
    (s.payload ->> 'interest_investigative')::numeric as interest_investigative,
    (s.payload ->> 'interest_artistic')::numeric as interest_artistic,
    (s.payload ->> 'interest_social')::numeric as interest_social,
    (s.payload ->> 'interest_enterprising')::numeric as interest_enterprising,
    (s.payload ->> 'interest_conventional')::numeric as interest_conventional,
    coalesce(s.payload -> 'tasks', '[]') as tasks,
    coalesce(s.payload -> 'skills', '[]') as skills,
    coalesce(s.payload -> 'titles', '[]') as titles,
    coalesce(s.payload -> 'related', '[]') as related
  from ingest.staged_records s
  where s.run_id = p_run_id and s.kind = 'occupation' and s.status = 'valid';

  -- Backstop for the runner's circuit breaker: never replace data with nothing.
  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero occupations';
  end if;

  select count(*) into v_added
  from pg_temp.incoming i
  where not exists (select from public.occupations o where o.onet_code = i.onet_code);

  select count(*) into v_changed
  from pg_temp.incoming i
  join public.occupations o on o.onet_code = i.onet_code
  where (o.title, o.description) is distinct from (i.title, i.description);

  -- Careers missing from this release are retired, not deleted (saved items
  -- point at them).
  update public.occupations o
  set retired_at = now()
  where o.source_id = 'onet'
    and o.retired_at is null
    and not exists (select from pg_temp.incoming i where i.onet_code = o.onet_code);
  get diagnostics v_removed = row_count;

  insert into public.occupations (
    onet_code, title, description, job_zone, education_level, education_share,
    interest_realistic, interest_investigative, interest_artistic,
    interest_social, interest_enterprising, interest_conventional,
    onet_release, source_id, retrieved_at, retired_at
  )
  select
    i.onet_code, i.title, i.description, i.job_zone, i.education_level, i.education_share,
    i.interest_realistic, i.interest_investigative, i.interest_artistic,
    i.interest_social, i.interest_enterprising, i.interest_conventional,
    p_release, 'onet', now(), null
  from pg_temp.incoming i
  on conflict (onet_code) do update
  set title = excluded.title,
      description = excluded.description,
      job_zone = excluded.job_zone,
      education_level = excluded.education_level,
      education_share = excluded.education_share,
      interest_realistic = excluded.interest_realistic,
      interest_investigative = excluded.interest_investigative,
      interest_artistic = excluded.interest_artistic,
      interest_social = excluded.interest_social,
      interest_enterprising = excluded.interest_enterprising,
      interest_conventional = excluded.interest_conventional,
      onet_release = excluded.onet_release,
      retrieved_at = excluded.retrieved_at,
      retired_at = null;

  insert into public.occupation_details (onet_code, tasks, skills)
  select i.onet_code, i.tasks, i.skills from pg_temp.incoming i
  on conflict (onet_code) do update set tasks = excluded.tasks, skills = excluded.skills;

  -- Titles and related careers: replaced for every career in this release.
  delete from public.occupation_titles t
  where exists (select from pg_temp.incoming i where i.onet_code = t.onet_code);

  insert into public.occupation_titles (onet_code, kind, title, featured)
  select distinct on (i.onet_code, x.kind, x.title) i.onet_code, x.kind, x.title, coalesce(x.featured, false)
  from pg_temp.incoming i,
       jsonb_to_recordset(i.titles) as x(kind text, title text, featured boolean)
  order by i.onet_code, x.kind, x.title, x.featured desc;

  delete from public.occupation_related r
  where exists (select from pg_temp.incoming i where i.onet_code = r.onet_code);

  -- A related code that isn't in this release is skipped.
  insert into public.occupation_related (onet_code, related_code, tier, rank)
  select distinct on (i.onet_code, x.code) i.onet_code, x.code, x.tier, x.rank
  from pg_temp.incoming i,
       jsonb_to_recordset(i.related) as x(code text, tier text, rank smallint)
  where x.code <> i.onet_code
    and exists (select from pg_temp.incoming j where j.onet_code = x.code)
  order by i.onet_code, x.code, x.rank;

  drop table pg_temp.incoming;

  return query select v_added, v_changed, v_removed;
end;
$$;

-- Quiz questions (O*NET Interest Profiler, 60 questions) --------------------

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'onet_ip',
  'O*NET Web Services: Interest Profiler questions',
  'api',
  'https://services.onetcenter.org/',
  'https://services.onetcenter.org/terms',
  '2026-09-28',
  true,
  interval '12 months',
  'Questions from the O*NET Interest Profiler by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), via O*NET Web Services. Used under the CC BY 4.0 license.'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (kind in ('occupation', 'occupation_outlook', 'interest_question'));

create table public.interest_questions (
  index smallint primary key
    constraint interest_questions_index_valid check (index between 1 and 60),
  area text not null
    constraint interest_questions_area_valid check (
      area in ('realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional')
    ),
  text text not null
    constraint interest_questions_text_valid check (char_length(text) between 1 and 300),
  source_id text not null default 'onet_ip' references public.sources (id),
  retrieved_at timestamptz not null
);

alter table public.interest_questions enable row level security;

create policy "Anyone can read interest questions"
  on public.interest_questions for select to anon, authenticated using (true);

revoke all on table public.interest_questions from anon, authenticated;
grant select on table public.interest_questions to anon, authenticated;

-- Replaces all questions in one transaction.
create function ingest.merge_interest_questions(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_changed integer;
  v_after integer;
begin
  if not exists (
    select from ingest.import_runs r
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'onet_ip'
  ) then
    raise exception 'Run % is not a running Interest Profiler run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(index smallint, area text, text text)
  where s.run_id = p_run_id and s.kind = 'interest_question' and s.status = 'valid';

  -- The quiz needs every question; a partial list is never merged.
  if (select count(*) from pg_temp.incoming) <> 60 then
    raise exception 'Expected 60 questions, got %', (select count(*) from pg_temp.incoming);
  end if;

  select count(*) into v_before from public.interest_questions;
  select count(*) into v_changed
  from pg_temp.incoming i
  join public.interest_questions q on q.index = i.index
  where (q.area, q.text) is distinct from (i.area, i.text);

  delete from public.interest_questions;
  insert into public.interest_questions (index, area, text, source_id, retrieved_at)
  select i.index, i.area, i.text, 'onet_ip', now() from pg_temp.incoming i;
  get diagnostics v_after = row_count;

  drop table pg_temp.incoming;

  return query select greatest(v_after - v_before, 0), v_changed, greatest(v_before - v_after, 0);
end;
$$;

revoke execute on function ingest.merge_interest_questions(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_interest_questions(bigint) to importer;
revoke execute on function ingest.merge_occupations(bigint, text) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_occupations(bigint, text) to importer;

-- Saved results (user data: owner-only) --------------------------------------
-- Only the six scores, never the answers. One row per student: saving again
-- replaces it.

create table public.interest_results (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  realistic smallint not null constraint interest_results_realistic_valid check (realistic between 0 and 40),
  investigative smallint not null constraint interest_results_investigative_valid check (investigative between 0 and 40),
  artistic smallint not null constraint interest_results_artistic_valid check (artistic between 0 and 40),
  social smallint not null constraint interest_results_social_valid check (social between 0 and 40),
  enterprising smallint not null constraint interest_results_enterprising_valid check (enterprising between 0 and 40),
  conventional smallint not null constraint interest_results_conventional_valid check (conventional between 0 and 40),
  taken_at timestamptz not null default now()
);

comment on table public.interest_results is
  'A student''s latest interest quiz scores (never the answers). Owner-only; deleted with the account.';

alter table public.interest_results enable row level security;

create policy "Students read their own interest results"
  on public.interest_results for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students save their own interest results"
  on public.interest_results for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students replace their own interest results"
  on public.interest_results for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Students remove their own interest results"
  on public.interest_results for delete to authenticated
  using ((select auth.uid()) = user_id);

-- user_id always comes from auth.uid(); only scores and the date can be sent.
revoke all on table public.interest_results from anon, authenticated;
grant select, delete on table public.interest_results to authenticated;
grant insert (realistic, investigative, artistic, social, enterprising, conventional, taken_at),
      update (realistic, investigative, artistic, social, enterprising, conventional, taken_at)
  on table public.interest_results to authenticated;

-- Matching -----------------------------------------------------------------
-- Ranks current careers by how closely the student's six scores follow the
-- career's six interest scores (Pearson correlation: only the shape of the
-- profile matters, so 0 to 40 and 1 to 7 compare fine). Equal scores in
-- every area have no shape, so nothing matches. Runs as the caller.

create function public.match_careers(
  p_realistic smallint,
  p_investigative smallint,
  p_artistic smallint,
  p_social smallint,
  p_enterprising smallint,
  p_conventional smallint,
  p_zone smallint default null
)
returns table (onet_code text, title text, fit double precision, job_zone smallint, education_level smallint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if exists (
    select from unnest(array[p_realistic, p_investigative, p_artistic, p_social, p_enterprising, p_conventional]) s
    where s is null or s not between 0 and 40
  ) then
    raise exception 'Interest scores must be between 0 and 40';
  end if;
  if p_zone is not null and p_zone not between 1 and 5 then
    raise exception 'Preparation level must be between 1 and 5';
  end if;

  return query
  select o.onet_code, o.title, corr(v.mine, v.theirs) as fit, o.job_zone, o.education_level
  from public.occupations o
  cross join lateral (values
    (p_realistic::double precision, o.interest_realistic::double precision),
    (p_investigative, o.interest_investigative),
    (p_artistic, o.interest_artistic),
    (p_social, o.interest_social),
    (p_enterprising, o.interest_enterprising),
    (p_conventional, o.interest_conventional)
  ) as v(mine, theirs)
  where o.retired_at is null
    and o.interest_realistic is not null
    and (p_zone is null or o.job_zone = p_zone)
  group by o.onet_code
  having corr(v.mine, v.theirs) is not null
  order by fit desc, o.title
  limit 30;
end;
$$;

revoke execute on function public.match_careers(smallint, smallint, smallint, smallint, smallint, smallint, smallint) from public;
grant execute on function public.match_careers(smallint, smallint, smallint, smallint, smallint, smallint, smallint)
  to anon, authenticated;
