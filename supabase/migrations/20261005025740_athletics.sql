-- College athlete path (spec ncaa-athlete-path.md, decision 0014): sports by
-- college and athletics level from EADA, class tags for the eligibility
-- checker, and sport, team and level filters on search_colleges().

-- EADA is a U.S. government work (public domain, 17 U.S.C. 105).
insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'eada', 'Equity in Athletics Data Analysis (EADA)', 'dataset', 'https://ope.ed.gov/athletics/',
  'https://ope.ed.gov/athletics/', '2026-10-04', true, interval '1 month',
  'Source: U.S. Department of Education, Equity in Athletics Data Analysis (EADA).'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution',
             'scholarship', 'opportunity', 'student_program', 'youth_program', 'career_license',
             'career_certification', 'college_athletics')
  );

-- EADA's classification code (1 NCAA I-FBS ... 20 USCAA; src/lib/athletes/sports.ts names them).
alter table public.institutions
  add column athletics_code smallint constraint institutions_athletics_code_valid check (athletics_code between 1 and 99);

-- One row per college and sport; men / women are participant counts, null = no team.
create table public.college_sports (
  unitid integer not null references public.institutions (unitid) on delete cascade,
  sport text not null constraint college_sports_sport_valid check (sport ~ '^[a-z][a-z-]{1,29}$'),
  men smallint constraint college_sports_men_valid check (men between 0 and 2000),
  women smallint constraint college_sports_women_valid check (women between 0 and 2000),
  primary key (unitid, sport),
  constraint college_sports_has_team check (men is not null or women is not null)
);
create index college_sports_by_sport on public.college_sports (sport, unitid);

alter table public.college_sports enable row level security;
create policy "Anyone can read college sports"
  on public.college_sports for select to anon, authenticated using (true);
revoke all on table public.college_sports from anon, authenticated;
grant select on table public.college_sports to anon, authenticated;

-- Colleges not in Scorecard are skipped; colleges no longer in EADA lose their level and teams.
create function ingest.merge_college_athletics(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql security definer set search_path = ''
as $$
declare v_added integer; v_changed integer; v_removed integer;
begin
  if not exists (select from ingest.import_runs r where r.id = p_run_id and r.status = 'running' and r.source_id = 'eada') then
    raise exception 'Run % is not a running EADA run', p_run_id;
  end if;
  create temporary table pg_temp.incoming on commit drop as
  select x.unitid, x.code, x.sports from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(unitid integer, code smallint, sports jsonb)
  where s.run_id = p_run_id and s.kind = 'college_athletics' and s.status = 'valid'
    and exists (select from public.institutions i where i.unitid = x.unitid);
  if not exists (select from pg_temp.incoming) then raise exception 'Refusing to merge zero colleges'; end if;

  create temporary table pg_temp.incoming_sports on commit drop as
  select i.unitid, y.sport, y.men, y.women
  from pg_temp.incoming i, jsonb_to_recordset(i.sports) as y(sport text, men smallint, women smallint);

  select count(*) into v_added from pg_temp.incoming_sports n
  where not exists (select from public.college_sports t where (t.unitid, t.sport) = (n.unitid, n.sport));
  select count(*) into v_changed from pg_temp.incoming_sports n
  join public.college_sports t on (t.unitid, t.sport) = (n.unitid, n.sport)
  where (t.men, t.women) is distinct from (n.men, n.women);
  delete from public.college_sports t
  where not exists (select from pg_temp.incoming_sports n where (n.unitid, n.sport) = (t.unitid, t.sport));
  get diagnostics v_removed = row_count;
  insert into public.college_sports (unitid, sport, men, women)
  select unitid, sport, men, women from pg_temp.incoming_sports
  on conflict (unitid, sport) do update set men = excluded.men, women = excluded.women;

  update public.institutions c set athletics_code = i.code
  from pg_temp.incoming i where c.unitid = i.unitid and c.athletics_code is distinct from i.code;
  update public.institutions c set athletics_code = null
  where c.athletics_code is not null and not exists (select from pg_temp.incoming i where i.unitid = c.unitid);

  drop table pg_temp.incoming_sports;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_college_athletics(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_college_athletics(bigint) to importer;

-- Class tags for the eligibility checker (decision 0014): optional core area and grade taken.
create or replace function public.academic_courses_valid(p_courses jsonb)
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
          or not (array['credits', 'grade', 'name', 'type'] <@ array(select jsonb_object_keys(e)))
          or not (array(select jsonb_object_keys(e)) <@ array['core', 'credits', 'grade', 'name', 'type', 'year'])
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
          or (e ? 'core' and (jsonb_typeof(e -> 'core') <> 'string'
                              or e ->> 'core' not in ('english', 'math', 'science', 'social', 'other')))
          or (e ? 'year' and (jsonb_typeof(e -> 'year') <> 'number' or e ->> 'year' not in ('9', '10', '11', '12')))
     )
$$;

drop function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer
);

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
  p_page integer default 1,
  p_sport text default null,
  p_team text default null,
  p_level text default null
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
  if p_sport is not null and p_sport !~ '^[a-z][a-z-]{1,29}$' then
    raise exception 'Unknown sport';
  end if;
  if p_team is not null and p_team not in ('men', 'women') then
    raise exception 'Unknown team';
  end if;
  if p_level is not null and p_level not in ('d1', 'd2', 'd3', 'naia', 'juco', 'other') then
    raise exception 'Unknown athletics level';
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
      and (p_level is null or i.athletics_code = any (case p_level
        when 'd1' then array[1, 2, 3] when 'd2' then array[4, 5] when 'd3' then array[6, 7]
        when 'naia' then array[9, 10] when 'juco' then array[12, 13, 14, 17, 19]
        else array[8, 15, 16, 18, 20] end::smallint[]))
      and (p_sport is null or exists (
        select from public.college_sports s
        where s.unitid = i.unitid and s.sport = p_sport
          and (p_team is null or (p_team = 'men' and s.men is not null) or (p_team = 'women' and s.women is not null))))
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
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer, text, text, text
) from public;
grant execute on function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer, text, text, text
) to anon, authenticated;
