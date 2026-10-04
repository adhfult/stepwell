-- College directory: test scores, test policy, net price by family income,
-- setting, two-year flag and minority-serving flags on institutions, and
-- search_colleges() for the /colleges page. Spec: docs/specs/college-directory.md.

alter table public.institutions
  add column sat_read_25 smallint constraint institutions_sat_read_25_valid check (sat_read_25 between 200 and 800),
  add column sat_read_75 smallint constraint institutions_sat_read_75_valid check (sat_read_75 between 200 and 800),
  add column sat_math_25 smallint constraint institutions_sat_math_25_valid check (sat_math_25 between 200 and 800),
  add column sat_math_75 smallint constraint institutions_sat_math_75_valid check (sat_math_75 between 200 and 800),
  add column act_25 smallint constraint institutions_act_25_valid check (act_25 between 1 and 36),
  add column act_75 smallint constraint institutions_act_75_valid check (act_75 between 1 and 36),
  add column test_policy text
    constraint institutions_test_policy_valid check (test_policy in ('required', 'recommended', 'considered', 'neither')),
  -- Net price for family incomes $0-30k, $30-48k, $48-75k, $75-110k, $110k+ (nulls allowed inside).
  add column net_price_by_income integer[] constraint institutions_net_price_by_income_valid
    check (cardinality(net_price_by_income) = 5 and 0 <= all (net_price_by_income)),
  add column locale text constraint institutions_locale_valid check (locale in ('city', 'suburb', 'town', 'rural')),
  add column two_year boolean,
  add column serves text[] constraint institutions_serves_valid
    check (serves <@ array['hbcu', 'pbi', 'hsi', 'tribal', 'aanapisi', 'annh', 'nant']);

-- Same merge as before, plus the new columns.
create or replace function ingest.merge_institutions(p_run_id bigint)
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
         net_price integer, admission_rate numeric, graduation_rate numeric, students integer,
         sat_read_25 smallint, sat_read_75 smallint, sat_math_25 smallint, sat_math_75 smallint,
         act_25 smallint, act_75 smallint, test_policy text, net_price_by_income integer[], locale text,
         two_year boolean, serves text[]
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
    graduation_rate, students, sat_read_25, sat_read_75, sat_math_25, sat_math_75, act_25, act_75, test_policy,
    net_price_by_income, locale, two_year, serves, source_id, retrieved_at
  )
  select
    i.unitid, i.name, i.city, i.state, i.ownership, i.website, i.net_price, i.admission_rate,
    i.graduation_rate, i.students, i.sat_read_25, i.sat_read_75, i.sat_math_25, i.sat_math_75, i.act_25,
    i.act_75, i.test_policy, i.net_price_by_income, i.locale, i.two_year, i.serves, 'scorecard', now()
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
      sat_read_25 = excluded.sat_read_25,
      sat_read_75 = excluded.sat_read_75,
      sat_math_25 = excluded.sat_math_25,
      sat_math_75 = excluded.sat_math_75,
      act_25 = excluded.act_25,
      act_75 = excluded.act_75,
      test_policy = excluded.test_policy,
      net_price_by_income = excluded.net_price_by_income,
      locale = excluded.locale,
      two_year = excluded.two_year,
      serves = excluded.serves,
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


-- Browse every college. Runs as the caller (security invoker), so RLS applies.
-- 24 rows a page; every row carries the total. A page past the end returns the
-- last page.
create function public.search_colleges(
  p_name text default null,
  p_program text default null,
  p_state text default null,
  p_ownership text default null,
  p_size text default null,
  p_bracket integer default null,
  p_max_price integer default null,
  p_admit text default null,
  p_test_optional boolean default null,
  p_locale text default null,
  p_two_year boolean default null,
  p_serves text default null,
  p_sort text default 'name',
  p_page integer default 1
)
returns table (
  unitid integer, name text, city text, state text, ownership text, students integer, price integer,
  admission_rate numeric, graduation_rate numeric, test_policy text, sat_read_25 smallint, sat_read_75 smallint,
  sat_math_25 smallint, sat_math_75 smallint, act_25 smallint, act_75 smallint, total bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_name text := replace(replace(replace(lower(btrim(p_name)), '\', '\\'), '%', '\%'), '_', '\_');
  v_program text := replace(replace(replace(lower(btrim(p_program)), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if char_length(p_name) > 100 or char_length(p_program) > 100 then
    raise exception 'Search text is too long';
  end if;
  if p_state is not null and p_state !~ '^[A-Z]{2}$' then
    raise exception 'State must be a two-letter code';
  end if;
  if p_ownership is not null and p_ownership not in ('public', 'private_nonprofit', 'for_profit') then
    raise exception 'Unknown college type';
  end if;
  if p_size is not null and p_size not in ('small', 'medium', 'large') then
    raise exception 'Unknown size';
  end if;
  if p_bracket is not null and p_bracket not between 1 and 5 then
    raise exception 'Unknown income bracket';
  end if;
  if p_max_price is not null and p_max_price < 0 then
    raise exception 'Price must not be negative';
  end if;
  if p_admit is not null and p_admit not in ('under25', '25to50', '50to75', 'over75') then
    raise exception 'Unknown admission rate range';
  end if;
  if p_locale is not null and p_locale not in ('city', 'suburb', 'town', 'rural') then
    raise exception 'Unknown setting';
  end if;
  if p_serves is not null and p_serves not in ('hbcu', 'pbi', 'hsi', 'tribal', 'aanapisi', 'annh', 'nant') then
    raise exception 'Unknown minority-serving flag';
  end if;
  if p_sort not in ('name', 'size', 'price') then
    raise exception 'Unknown sort';
  end if;
  if p_page is null or p_page < 1 then
    raise exception 'Page must be 1 or more';
  end if;

  return query
  with matches as (
    select i.*, case when p_bracket is null then i.net_price else i.net_price_by_income[p_bracket] end as cost
    from public.institutions i
    where (coalesce(v_name, '') = '' or lower(i.name) like '%' || v_name || '%')
      and (coalesce(v_program, '') = '' or exists (
        select from public.programs p where p.unitid = i.unitid and lower(p.title) like '%' || v_program || '%'))
      and (p_state is null or i.state = p_state)
      and (p_ownership is null or i.ownership = p_ownership)
      and (p_size is null
        or (p_size = 'small' and i.students < 5000)
        or (p_size = 'medium' and i.students between 5000 and 15000)
        or (p_size = 'large' and i.students > 15000))
      and (p_admit is null
        or (p_admit = 'under25' and i.admission_rate < 0.25)
        or (p_admit = '25to50' and i.admission_rate >= 0.25 and i.admission_rate < 0.5)
        or (p_admit = '50to75' and i.admission_rate >= 0.5 and i.admission_rate < 0.75)
        or (p_admit = 'over75' and i.admission_rate >= 0.75))
      and (p_test_optional is null or p_test_optional = (i.test_policy is distinct from 'required'))
      and (p_locale is null or i.locale = p_locale)
      and (p_two_year is null or i.two_year = p_two_year)
      and (p_serves is null or p_serves = any (i.serves))
  ),
  numbered as (
    select m.*,
      row_number() over (order by
        case when p_sort = 'size' then m.students end desc nulls last,
        case when p_sort = 'price' then m.cost end asc nulls last,
        m.name, m.unitid) as rn,
      count(*) over () as n
    from matches m
    where p_max_price is null or m.cost <= p_max_price
  )
  select x.unitid, x.name, x.city, x.state, x.ownership, x.students, x.cost, x.admission_rate, x.graduation_rate,
         x.test_policy, x.sat_read_25, x.sat_read_75, x.sat_math_25, x.sat_math_75, x.act_25, x.act_75, x.n
  from numbered x
  where x.rn > least(p_page - 1, (x.n - 1) / 24) * 24
    and x.rn <= least(p_page - 1, (x.n - 1) / 24) * 24 + 24
  order by x.rn;
end;
$$;

revoke execute on function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer
) from public;
grant execute on function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer
) to anon, authenticated;
