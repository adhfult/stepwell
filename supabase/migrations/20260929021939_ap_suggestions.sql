-- AP and academics suggestions: O*NET knowledge ratings per career, the AP
-- course list, and Stepwell's own map from knowledge areas to AP courses.
-- Spec: docs/specs/ap-suggestions.md. v1 expansion, Section 2.5.

-- The 33 O*NET knowledge areas (ids and names from knowledge.csv, 31.0).
create table public.knowledge_areas (
  id text primary key constraint knowledge_areas_id_valid check (id ~ '^2\.C\.\d+(\.[a-z])?$'),
  name text not null unique
);

insert into public.knowledge_areas (id, name) values
  ('2.C.1.a', 'Administration and Management'),
  ('2.C.1.b', 'Administrative'),
  ('2.C.1.c', 'Economics and Accounting'),
  ('2.C.1.d', 'Sales and Marketing'),
  ('2.C.1.e', 'Customer and Personal Service'),
  ('2.C.1.f', 'Personnel and Human Resources'),
  ('2.C.2.a', 'Production and Processing'),
  ('2.C.2.b', 'Food Production'),
  ('2.C.3.a', 'Computers and Electronics'),
  ('2.C.3.b', 'Engineering and Technology'),
  ('2.C.3.c', 'Design'),
  ('2.C.3.d', 'Building and Construction'),
  ('2.C.3.e', 'Mechanical'),
  ('2.C.4.a', 'Mathematics'),
  ('2.C.4.b', 'Physics'),
  ('2.C.4.c', 'Chemistry'),
  ('2.C.4.d', 'Biology'),
  ('2.C.4.e', 'Psychology'),
  ('2.C.4.f', 'Sociology and Anthropology'),
  ('2.C.4.g', 'Geography'),
  ('2.C.5.a', 'Medicine and Dentistry'),
  ('2.C.5.b', 'Therapy and Counseling'),
  ('2.C.6', 'Education and Training'),
  ('2.C.7.a', 'English Language'),
  ('2.C.7.b', 'Foreign Language'),
  ('2.C.7.c', 'Fine Arts'),
  ('2.C.7.d', 'History and Archeology'),
  ('2.C.7.e', 'Philosophy and Theology'),
  ('2.C.8.a', 'Public Safety and Security'),
  ('2.C.8.b', 'Law and Government'),
  ('2.C.9.a', 'Telecommunications'),
  ('2.C.9.b', 'Communications and Media'),
  ('2.C.10', 'Transportation');

-- College Board's AP courses (course index, checked 2026-09-28).
create table public.ap_courses (
  code text primary key constraint ap_courses_code_valid check (code ~ '^[a-z0-9-]{2,40}$'),
  name text not null unique,
  course_group text not null
);

insert into public.ap_courses (code, name, course_group) values
  ('art-2d', 'AP 2-D Art and Design', 'Arts'),
  ('art-3d', 'AP 3-D Art and Design', 'Arts'),
  ('drawing', 'AP Drawing', 'Arts'),
  ('art-history', 'AP Art History', 'Arts'),
  ('music-theory', 'AP Music Theory', 'Arts'),
  ('english-language', 'AP English Language and Composition', 'English'),
  ('english-literature', 'AP English Literature and Composition', 'English'),
  ('african-american-studies', 'AP African American Studies', 'History and Social Sciences'),
  ('comparative-government', 'AP Comparative Government and Politics', 'History and Social Sciences'),
  ('european-history', 'AP European History', 'History and Social Sciences'),
  ('human-geography', 'AP Human Geography', 'History and Social Sciences'),
  ('macroeconomics', 'AP Macroeconomics', 'History and Social Sciences'),
  ('microeconomics', 'AP Microeconomics', 'History and Social Sciences'),
  ('psychology', 'AP Psychology', 'History and Social Sciences'),
  ('us-government', 'AP United States Government and Politics', 'History and Social Sciences'),
  ('us-history', 'AP United States History', 'History and Social Sciences'),
  ('world-history', 'AP World History: Modern', 'History and Social Sciences'),
  ('calculus-ab', 'AP Calculus AB', 'Math and Computer Science'),
  ('calculus-bc', 'AP Calculus BC', 'Math and Computer Science'),
  ('computer-science-a', 'AP Computer Science A', 'Math and Computer Science'),
  ('computer-science-principles', 'AP Computer Science Principles', 'Math and Computer Science'),
  ('precalculus', 'AP Precalculus', 'Math and Computer Science'),
  ('statistics', 'AP Statistics', 'Math and Computer Science'),
  ('biology', 'AP Biology', 'Sciences'),
  ('chemistry', 'AP Chemistry', 'Sciences'),
  ('environmental-science', 'AP Environmental Science', 'Sciences'),
  ('physics-1', 'AP Physics 1: Algebra-Based', 'Sciences'),
  ('physics-2', 'AP Physics 2: Algebra-Based', 'Sciences'),
  ('physics-c-em', 'AP Physics C: Electricity and Magnetism', 'Sciences'),
  ('physics-c-mechanics', 'AP Physics C: Mechanics', 'Sciences'),
  ('chinese', 'AP Chinese Language and Culture', 'World Languages and Cultures'),
  ('french', 'AP French Language and Culture', 'World Languages and Cultures'),
  ('german', 'AP German Language and Culture', 'World Languages and Cultures'),
  ('italian', 'AP Italian Language and Culture', 'World Languages and Cultures'),
  ('japanese', 'AP Japanese Language and Culture', 'World Languages and Cultures'),
  ('latin', 'AP Latin', 'World Languages and Cultures'),
  ('spanish-language', 'AP Spanish Language and Culture', 'World Languages and Cultures'),
  ('spanish-literature', 'AP Spanish Literature and Culture', 'World Languages and Cultures'),
  ('research', 'AP Research', 'AP Capstone'),
  ('seminar', 'AP Seminar', 'AP Capstone'),
  ('business-personal-finance', 'AP Business with Personal Finance', 'AP Career Kickstart'),
  ('cybersecurity', 'AP Cybersecurity', 'AP Career Kickstart');

-- Stepwell's own mapping, reviewed in docs/specs/ap-suggestions.md. Areas
-- with no fitting AP course have no rows.
create table public.knowledge_ap_map (
  area_id text not null references public.knowledge_areas (id),
  ap_code text not null references public.ap_courses (code),
  primary key (area_id, ap_code)
);

insert into public.knowledge_ap_map (area_id, ap_code) values
  ('2.C.1.a', 'business-personal-finance'),
  ('2.C.1.a', 'microeconomics'),
  ('2.C.1.c', 'macroeconomics'),
  ('2.C.1.c', 'microeconomics'),
  ('2.C.1.c', 'business-personal-finance'),
  ('2.C.1.d', 'business-personal-finance'),
  ('2.C.1.d', 'microeconomics'),
  ('2.C.1.f', 'psychology'),
  ('2.C.2.b', 'environmental-science'),
  ('2.C.2.b', 'biology'),
  ('2.C.3.a', 'computer-science-a'),
  ('2.C.3.a', 'computer-science-principles'),
  ('2.C.3.a', 'cybersecurity'),
  ('2.C.3.b', 'physics-1'),
  ('2.C.3.b', 'physics-c-mechanics'),
  ('2.C.3.b', 'calculus-ab'),
  ('2.C.3.c', 'art-2d'),
  ('2.C.3.c', 'art-3d'),
  ('2.C.3.c', 'drawing'),
  ('2.C.3.d', 'physics-1'),
  ('2.C.3.e', 'physics-1'),
  ('2.C.3.e', 'physics-c-mechanics'),
  ('2.C.4.a', 'precalculus'),
  ('2.C.4.a', 'calculus-ab'),
  ('2.C.4.a', 'calculus-bc'),
  ('2.C.4.a', 'statistics'),
  ('2.C.4.b', 'physics-1'),
  ('2.C.4.b', 'physics-2'),
  ('2.C.4.b', 'physics-c-mechanics'),
  ('2.C.4.b', 'physics-c-em'),
  ('2.C.4.c', 'chemistry'),
  ('2.C.4.d', 'biology'),
  ('2.C.4.d', 'environmental-science'),
  ('2.C.4.e', 'psychology'),
  ('2.C.4.f', 'human-geography'),
  ('2.C.4.f', 'african-american-studies'),
  ('2.C.4.g', 'human-geography'),
  ('2.C.4.g', 'environmental-science'),
  ('2.C.5.a', 'biology'),
  ('2.C.5.a', 'chemistry'),
  ('2.C.5.b', 'psychology'),
  ('2.C.5.b', 'biology'),
  ('2.C.6', 'psychology'),
  ('2.C.7.a', 'english-language'),
  ('2.C.7.a', 'english-literature'),
  ('2.C.7.b', 'chinese'),
  ('2.C.7.b', 'french'),
  ('2.C.7.b', 'german'),
  ('2.C.7.b', 'italian'),
  ('2.C.7.b', 'japanese'),
  ('2.C.7.b', 'latin'),
  ('2.C.7.b', 'spanish-language'),
  ('2.C.7.b', 'spanish-literature'),
  ('2.C.7.c', 'art-history'),
  ('2.C.7.c', 'music-theory'),
  ('2.C.7.c', 'drawing'),
  ('2.C.7.c', 'art-2d'),
  ('2.C.7.d', 'us-history'),
  ('2.C.7.d', 'world-history'),
  ('2.C.7.d', 'european-history'),
  ('2.C.7.d', 'african-american-studies'),
  ('2.C.7.e', 'seminar'),
  ('2.C.8.a', 'us-government'),
  ('2.C.8.b', 'us-government'),
  ('2.C.8.b', 'comparative-government'),
  ('2.C.9.a', 'computer-science-principles'),
  ('2.C.9.a', 'cybersecurity'),
  ('2.C.9.b', 'english-language'),
  ('2.C.9.b', 'seminar');

-- How important each knowledge area is to each career (O*NET "IM", 1 to 5).
create table public.occupation_knowledge (
  onet_code text not null references public.occupations (onet_code) on delete cascade,
  area_id text not null references public.knowledge_areas (id),
  importance numeric(3, 2) not null
    constraint occupation_knowledge_importance_valid check (importance between 1 and 5),
  primary key (onet_code, area_id)
);

alter table public.knowledge_areas enable row level security;
alter table public.ap_courses enable row level security;
alter table public.knowledge_ap_map enable row level security;
alter table public.occupation_knowledge enable row level security;

create policy "Anyone can read knowledge areas" on public.knowledge_areas for select to anon, authenticated using (true);
create policy "Anyone can read AP courses" on public.ap_courses for select to anon, authenticated using (true);
create policy "Anyone can read the AP map" on public.knowledge_ap_map for select to anon, authenticated using (true);
create policy "Anyone can read occupation knowledge" on public.occupation_knowledge for select to anon, authenticated using (true);

revoke all on table public.knowledge_areas, public.ap_courses, public.knowledge_ap_map, public.occupation_knowledge
  from anon, authenticated;
grant select on table public.knowledge_areas, public.ap_courses, public.knowledge_ap_map, public.occupation_knowledge
  to anon, authenticated;

-- The O*NET merge now also copies knowledge ratings.
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
    coalesce(s.payload -> 'related', '[]') as related,
    coalesce(s.payload -> 'knowledge', '[]') as knowledge
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

  -- Knowledge ratings: replaced for every career in this release; unknown
  -- areas are skipped.
  delete from public.occupation_knowledge k
  where exists (select from pg_temp.incoming i where i.onet_code = k.onet_code);

  insert into public.occupation_knowledge (onet_code, area_id, importance)
  select distinct on (i.onet_code, x.area_id) i.onet_code, x.area_id, x.importance
  from pg_temp.incoming i,
       jsonb_to_recordset(i.knowledge) as x(area_id text, importance numeric)
  where exists (select from public.knowledge_areas a where a.id = x.area_id)
  order by i.onet_code, x.area_id;

  drop table pg_temp.incoming;

  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_occupations(bigint, text) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_occupations(bigint, text) to importer;

-- AP courses for a career: from knowledge areas rated 3.5 or more, most
-- important first, each course once (with its most important area), at
-- most 6. Runs as the caller.
create function public.ap_courses_for_career(p_onet_code text)
returns table (ap_code text, ap_name text, area_name text, importance numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.code, c.name, best.area_name, best.importance
  from (
    select distinct on (m.ap_code) m.ap_code, a.name as area_name, k.importance
    from public.occupation_knowledge k
    join public.knowledge_areas a on a.id = k.area_id
    join public.knowledge_ap_map m on m.area_id = k.area_id
    where k.onet_code = p_onet_code and k.importance >= 3.5
    order by m.ap_code, k.importance desc
  ) best
  join public.ap_courses c on c.code = best.ap_code
  order by best.importance desc, c.name
  limit 6;
$$;

revoke execute on function public.ap_courses_for_career(text) from public;
grant execute on function public.ap_courses_for_career(text) to anon, authenticated;
