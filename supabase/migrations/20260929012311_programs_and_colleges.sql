-- Programs and colleges: which programs of study lead to each career (O*NET's
-- CIP to O*NET-SOC crosswalk), and the colleges that offer them (College
-- Scorecard). Spec: docs/specs/programs-and-colleges.md. v1 expansion, 2.4.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values
  (
    'onet_cip',
    'O*NET crosswalk: 2020 CIP to O*NET-SOC 2019',
    'dataset',
    'https://www.onetcenter.org/crosswalks.html',
    'https://www.onetcenter.org/license_db.html',
    '2026-09-28',
    true,
    interval '12 months',
    'Programs matched to careers with the O*NET CIP to O*NET-SOC crosswalk by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.'
  ),
  (
    'scorecard',
    'College Scorecard',
    'api',
    'https://collegescorecard.ed.gov/',
    'https://collegescorecard.ed.gov/data/',
    '2026-09-28',
    true,
    interval '3 months',
    'College Scorecard, U.S. Department of Education.'
  );

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution')
  );

-- Programs of study linked to each career -----------------------------------

create table public.occupation_programs (
  onet_code text not null references public.occupations (onet_code) on delete cascade,
  cip6 text not null
    constraint occupation_programs_cip6_valid check (cip6 ~ '^\d{2}\.\d{4}$'),
  -- College Scorecard reports programs by 4-digit CIP, so the join uses this.
  cip4 text generated always as (left(cip6, 5)) stored,
  cip_title text not null
    constraint occupation_programs_title_valid check (char_length(cip_title) between 1 and 200),
  primary key (onet_code, cip6)
);

create index occupation_programs_cip4 on public.occupation_programs (cip4);

-- Colleges ---------------------------------------------------------------------

create table public.institutions (
  -- Scorecard's id (the IPEDS unit id).
  unitid integer primary key
    constraint institutions_unitid_valid check (unitid > 0),
  name text not null
    constraint institutions_name_valid check (char_length(name) between 1 and 200),
  city text constraint institutions_city_valid check (char_length(city) <= 100),
  state text constraint institutions_state_valid check (state ~ '^[A-Z]{2}$'),
  ownership text
    constraint institutions_ownership_valid check (ownership in ('public', 'private_nonprofit', 'for_profit')),
  -- Always https:// (added by the import when Scorecard leaves it off).
  website text constraint institutions_website_valid check (website ~ '^https://[^\s]+$'),
  -- Average yearly cost after grants and scholarships, whole dollars.
  net_price integer constraint institutions_net_price_valid check (net_price >= 0),
  admission_rate numeric(5, 4) constraint institutions_admission_rate_valid check (admission_rate between 0 and 1),
  graduation_rate numeric(5, 4) constraint institutions_graduation_rate_valid check (graduation_rate between 0 and 1),
  students integer constraint institutions_students_valid check (students >= 0),
  source_id text not null default 'scorecard' references public.sources (id),
  retrieved_at timestamptz not null
);

create index institutions_state on public.institutions (state);

-- Programs at colleges (Scorecard "field of study") ----------------------------

create table public.programs (
  -- Stable: the merge upserts on (unitid, cip4, credential_level), so saved
  -- programs (build step 9) keep pointing at the same row.
  id bigint generated always as identity primary key,
  unitid integer not null references public.institutions (unitid) on delete cascade,
  cip4 text not null constraint programs_cip4_valid check (cip4 ~ '^\d{2}\.\d{2}$'),
  -- Scorecard's levels: 1 undergraduate certificate, 2 associate's,
  -- 3 bachelor's, 4 post-baccalaureate certificate, 5 master's, 6 doctoral,
  -- 7 first professional, 8 graduate certificate.
  credential_level smallint not null
    constraint programs_credential_level_valid check (credential_level between 1 and 8),
  title text not null constraint programs_title_valid check (char_length(title) between 1 and 200),
  credential_title text not null
    constraint programs_credential_title_valid check (char_length(credential_title) between 1 and 100),
  -- Median earnings of graduates who got federal aid, 4 and 1 years after
  -- completing; median federal loan debt; graduates in the latest year.
  earnings_4yr integer constraint programs_earnings_4yr_valid check (earnings_4yr > 0),
  earnings_1yr integer constraint programs_earnings_1yr_valid check (earnings_1yr > 0),
  median_debt integer constraint programs_median_debt_valid check (median_debt > 0),
  graduates integer constraint programs_graduates_valid check (graduates >= 0),
  constraint programs_one_per_credential unique (unitid, cip4, credential_level)
);

create index programs_cip4 on public.programs (cip4);

-- Reference data: anyone reads, only the merges write --------------------------

alter table public.occupation_programs enable row level security;
alter table public.institutions enable row level security;
alter table public.programs enable row level security;

create policy "Anyone can read occupation programs"
  on public.occupation_programs for select to anon, authenticated using (true);
create policy "Anyone can read institutions"
  on public.institutions for select to anon, authenticated using (true);
create policy "Anyone can read programs"
  on public.programs for select to anon, authenticated using (true);

revoke all on table public.occupation_programs, public.institutions, public.programs from anon, authenticated;
grant select on table public.occupation_programs, public.institutions, public.programs to anon, authenticated;

-- Merges -----------------------------------------------------------------------

-- Replaces the whole crosswalk in one transaction; codes for careers we
-- don't have are skipped.
create function ingest.merge_occupation_programs(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
begin
  if not exists (
    select from ingest.import_runs r
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'onet_cip'
  ) then
    raise exception 'Run % is not a running crosswalk run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select distinct on (x.onet_code, x.cip6) x.onet_code, x.cip6, x.cip_title
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(onet_code text, cip6 text, cip_title text)
  where s.run_id = p_run_id and s.kind = 'occupation_program' and s.status = 'valid'
    and exists (select from public.occupations o where o.onet_code = x.onet_code)
  order by x.onet_code, x.cip6;

  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge an empty crosswalk';
  end if;

  select count(*) into v_before from public.occupation_programs;
  delete from public.occupation_programs;
  insert into public.occupation_programs (onet_code, cip6, cip_title)
  select i.onet_code, i.cip6, i.cip_title from pg_temp.incoming i;
  get diagnostics v_after = row_count;

  drop table pg_temp.incoming;
  return query select greatest(v_after - v_before, 0), 0, greatest(v_before - v_after, 0);
end;
$$;

-- Colleges with their programs nested in each staged record. Counts are for
-- colleges; program ids stay stable.
create function ingest.merge_institutions(p_run_id bigint)
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
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'scorecard'
  ) then
    raise exception 'Run % is not a running College Scorecard run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*, s.payload -> 'programs' as programs
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(
         unitid integer, name text, city text, state text, ownership text, website text,
         net_price integer, admission_rate numeric, graduation_rate numeric, students integer
       )
  where s.run_id = p_run_id and s.kind = 'institution' and s.status = 'valid';

  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero colleges';
  end if;

  create temporary table pg_temp.incoming_programs on commit drop as
  select distinct on (i.unitid, p.cip4, p.credential_level) i.unitid, p.*
  from pg_temp.incoming i,
       jsonb_to_recordset(coalesce(i.programs, '[]')) as p(
         cip4 text, credential_level smallint, title text, credential_title text,
         earnings_4yr integer, earnings_1yr integer, median_debt integer, graduates integer
       )
  order by i.unitid, p.cip4, p.credential_level;

  select count(*) into v_added
  from pg_temp.incoming i
  where not exists (select from public.institutions c where c.unitid = i.unitid);

  select count(*) into v_changed
  from pg_temp.incoming i
  join public.institutions c on c.unitid = i.unitid
  where (c.name, c.city, c.state, c.net_price, c.graduation_rate)
        is distinct from (i.name, i.city, i.state, i.net_price, i.graduation_rate);

  -- Colleges no longer listed go, with their programs (cascade).
  delete from public.institutions c
  where not exists (select from pg_temp.incoming i where i.unitid = c.unitid);
  get diagnostics v_removed = row_count;

  insert into public.institutions (
    unitid, name, city, state, ownership, website, net_price, admission_rate,
    graduation_rate, students, source_id, retrieved_at
  )
  select
    i.unitid, i.name, i.city, i.state, i.ownership, i.website, i.net_price, i.admission_rate,
    i.graduation_rate, i.students, 'scorecard', now()
  from pg_temp.incoming i
  on conflict (unitid) do update
  set name = excluded.name,
      city = excluded.city,
      state = excluded.state,
      ownership = excluded.ownership,
      website = excluded.website,
      net_price = excluded.net_price,
      admission_rate = excluded.admission_rate,
      graduation_rate = excluded.graduation_rate,
      students = excluded.students,
      retrieved_at = excluded.retrieved_at;

  -- Programs a college no longer lists go; the rest are upserted in place.
  delete from public.programs p
  where not exists (
    select from pg_temp.incoming_programs n
    where n.unitid = p.unitid and n.cip4 = p.cip4 and n.credential_level = p.credential_level
  );

  insert into public.programs (
    unitid, cip4, credential_level, title, credential_title,
    earnings_4yr, earnings_1yr, median_debt, graduates
  )
  select
    n.unitid, n.cip4, n.credential_level, n.title, n.credential_title,
    n.earnings_4yr, n.earnings_1yr, n.median_debt, n.graduates
  from pg_temp.incoming_programs n
  on conflict (unitid, cip4, credential_level) do update
  set title = excluded.title,
      credential_title = excluded.credential_title,
      earnings_4yr = excluded.earnings_4yr,
      earnings_1yr = excluded.earnings_1yr,
      median_debt = excluded.median_debt,
      graduates = excluded.graduates;

  drop table pg_temp.incoming_programs;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_occupation_programs(bigint), ingest.merge_institutions(bigint)
  from public, anon, authenticated, service_role;
grant execute on function ingest.merge_occupation_programs(bigint), ingest.merge_institutions(bigint)
  to importer;

-- Colleges for a career ----------------------------------------------------------
-- Programs linked to the career (through its 6-digit CIP codes' 4-digit
-- families) at colleges, best earnings first. Runs as the caller.

create function public.colleges_for_career(
  p_onet_code text,
  p_state text default null,
  p_level text default null
)
returns table (
  program_id bigint,
  unitid integer,
  college text,
  city text,
  state text,
  ownership text,
  website text,
  net_price integer,
  graduation_rate numeric,
  program text,
  credential_title text,
  credential_level smallint,
  earnings_4yr integer,
  earnings_1yr integer,
  median_debt integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_state is not null and p_state !~ '^[A-Z]{2}$' then
    raise exception 'State must be a two-letter code';
  end if;
  if p_level is not null and p_level not in ('certificate', 'associate', 'bachelor', 'graduate') then
    raise exception 'Unknown credential level';
  end if;

  return query
  select
    p.id, i.unitid, i.name, i.city, i.state, i.ownership, i.website, i.net_price, i.graduation_rate,
    p.title, p.credential_title, p.credential_level, p.earnings_4yr, p.earnings_1yr, p.median_debt
  from public.programs p
  join public.institutions i on i.unitid = p.unitid
  where p.cip4 in (select m.cip4 from public.occupation_programs m where m.onet_code = p_onet_code)
    and (p_state is null or i.state = p_state)
    and (
      p_level is null
      or (p_level = 'certificate' and p.credential_level = 1)
      or (p_level = 'associate' and p.credential_level = 2)
      or (p_level = 'bachelor' and p.credential_level = 3)
      or (p_level = 'graduate' and p.credential_level between 4 and 8)
    )
  order by coalesce(p.earnings_4yr, p.earnings_1yr) desc nulls last, i.name, p.credential_level
  limit 50;
end;
$$;

revoke execute on function public.colleges_for_career(text, text, text) from public;
grant execute on function public.colleges_for_career(text, text, text) to anon, authenticated;
