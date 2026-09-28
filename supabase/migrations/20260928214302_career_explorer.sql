-- Career Explorer: more O*NET data per career, retired careers, career
-- search, and saved careers.
-- Spec: docs/specs/career-explorer.md. v1 expansion, Sections 2.3 and 2.7.

create extension if not exists pg_trgm with schema extensions;

-- Occupations: preparation, education, and retirement ---------------------

alter table public.occupations
  -- O*NET job zone: how much preparation the work needs (1 = little, 5 = extensive).
  add column job_zone smallint
    constraint occupations_job_zone_valid check (job_zone between 1 and 5),
  -- The education level most workers reported (O*NET categories 1 to 12),
  -- and the share of workers who reported it (empty when O*NET flags the
  -- share as imprecise).
  add column education_level smallint
    constraint occupations_education_level_valid check (education_level between 1 and 12),
  add column education_share smallint
    constraint occupations_education_share_valid check (education_share between 0 and 100),
  -- Set when a newer O*NET release no longer lists this career. Kept, so a
  -- student's saved career never disappears; hidden from search.
  add column retired_at timestamptz,
  add constraint occupations_education_share_needs_level check (
    education_share is null or education_level is not null
  );

create index occupations_title_trgm on public.occupations
  using gin (lower(title) extensions.gin_trgm_ops);

-- Titles: "also called" (reported) and search-only alternates --------------

create table public.occupation_titles (
  onet_code text not null references public.occupations (onet_code) on delete cascade,
  kind text not null
    constraint occupation_titles_kind_valid check (kind in ('reported', 'alternate')),
  title text not null
    constraint occupation_titles_title_valid check (char_length(title) between 1 and 200),
  -- Reported titles O*NET's own student site (My Next Move) shows first.
  featured boolean not null default false,
  primary key (onet_code, kind, title)
);

create index occupation_titles_title_trgm on public.occupation_titles
  using gin (lower(title) extensions.gin_trgm_ops);

-- Details: display-only lists ----------------------------------------------

create table public.occupation_details (
  onet_code text primary key references public.occupations (onet_code) on delete cascade,
  -- Most important core tasks first; plain strings.
  tasks jsonb not null default '[]'
    constraint occupation_details_tasks_array check (jsonb_typeof(tasks) = 'array'),
  -- Most important skills first; plain strings.
  skills jsonb not null default '[]'
    constraint occupation_details_skills_array check (jsonb_typeof(skills) = 'array')
);

-- Related careers ----------------------------------------------------------

create table public.occupation_related (
  onet_code text not null references public.occupations (onet_code) on delete cascade,
  related_code text not null references public.occupations (onet_code) on delete cascade,
  tier text not null
    constraint occupation_related_tier_valid check (tier in ('primary_short', 'primary_long', 'supplemental')),
  rank smallint not null
    constraint occupation_related_rank_valid check (rank > 0),
  primary key (onet_code, related_code),
  constraint occupation_related_not_self check (onet_code <> related_code)
);

create index occupation_related_related_code on public.occupation_related (related_code);

-- Reference data: anyone reads, only the merge writes ----------------------

alter table public.occupation_titles enable row level security;
alter table public.occupation_details enable row level security;
alter table public.occupation_related enable row level security;

create policy "Anyone can read occupation titles"
  on public.occupation_titles for select to anon, authenticated using (true);
create policy "Anyone can read occupation details"
  on public.occupation_details for select to anon, authenticated using (true);
create policy "Anyone can read related occupations"
  on public.occupation_related for select to anon, authenticated using (true);

revoke all on table public.occupation_titles, public.occupation_details, public.occupation_related
  from anon, authenticated;
grant select on table public.occupation_titles, public.occupation_details, public.occupation_related
  to anon, authenticated;

-- Saved items (user data: owner-only) ---------------------------------------
-- One row per saved thing, one link column per kind; later kinds (college,
-- program, scholarship, ...) add a column and join the "exactly one" check.

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- No cascade: occupations are retired, never deleted.
  onet_code text references public.occupations (onet_code),
  created_at timestamptz not null default now(),
  constraint saved_items_exactly_one check (num_nonnulls(onet_code) = 1),
  constraint saved_items_one_per_career unique (user_id, onet_code)
);

comment on table public.saved_items is
  'What a student saved. Owner-only; deleted with the account.';

alter table public.saved_items enable row level security;

create policy "Students read their own saved items"
  on public.saved_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students save items for themselves"
  on public.saved_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students remove their own saved items"
  on public.saved_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Only the link column can be sent; user_id always comes from auth.uid().
revoke all on table public.saved_items from anon, authenticated;
grant select, delete on table public.saved_items to authenticated;
grant insert (onet_code) on table public.saved_items to authenticated;

-- Search -------------------------------------------------------------------
-- Ranks: 0 exact title, 1 exact other title ("nurse" is an alternate title
-- of Registered Nurses), 2 title starts with the query, 3 title contains it,
-- 4 another title contains it; only when none of those match, close
-- spellings: 5 on a title, 6 on another title. Ties: closer spelling, then
-- the general career (code ending .00) before its specialties, then shorter.
-- Close spellings use word similarity 0.5 or more (typos like "sofware"
-- score about 0.55; pg_trgm's default cut-off of 0.6 misses them, and a
-- function may not change that setting). That check reads every title, so
-- it runs only when nothing matched directly.
-- Runs as the caller (security invoker), so RLS applies as usual.

create function public.search_occupations(p_query text)
returns table (
  onet_code text,
  title text,
  matched_title text,
  job_zone smallint,
  education_level smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      lower(btrim(p_query)) as term,
      -- LIKE treats % and _ as wildcards; match them literally.
      replace(replace(replace(lower(btrim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') as pattern
  ),
  matches as (
    select
      o.onet_code,
      null::text as matched_title,
      case
        when lower(o.title) = q.term then 0
        when lower(o.title) like q.pattern || '%' then 2
        else 3
      end as rank,
      extensions.word_similarity(q.term, lower(o.title)) as score
    from public.occupations o, q
    where q.term <> '' and lower(o.title) like '%' || q.pattern || '%'
    union all
    select
      t.onet_code,
      t.title,
      case when lower(t.title) = q.term then 1 else 4 end,
      extensions.word_similarity(q.term, lower(t.title))
    from public.occupation_titles t, q
    where q.term <> '' and lower(t.title) like '%' || q.pattern || '%'
  ),
  close_spellings as (
    select o.onet_code, null::text, 5, extensions.word_similarity(q.term, lower(o.title))
    from public.occupations o, q
    where q.term <> '' and not exists (select from matches)
      and extensions.word_similarity(q.term, lower(o.title)) >= 0.5
    union all
    select t.onet_code, t.title, 6, extensions.word_similarity(q.term, lower(t.title))
    from public.occupation_titles t, q
    where q.term <> '' and not exists (select from matches)
      and extensions.word_similarity(q.term, lower(t.title)) >= 0.5
  ),
  best as (
    select distinct on (c.onet_code) c.onet_code, c.matched_title, c.rank, c.score
    from (select * from matches union all select * from close_spellings) c
    order by c.onet_code, c.rank, c.score desc
  )
  select b.onet_code, o.title, b.matched_title, o.job_zone, o.education_level
  from best b
  join public.occupations o on o.onet_code = b.onet_code
  where o.retired_at is null
  order by b.rank, b.score desc, right(o.onet_code, 2) <> '00', char_length(o.title), o.title
  limit 30;
$$;

revoke execute on function public.search_occupations(text) from public;
grant execute on function public.search_occupations(text) to anon, authenticated;

-- Merge: details, titles, related careers; retire instead of delete ---------
-- The payload of each staged occupation now also carries job_zone,
-- education_level, education_share, tasks, skills, titles and related.

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
    onet_release, source_id, retrieved_at, retired_at
  )
  select
    i.onet_code, i.title, i.description, i.job_zone, i.education_level, i.education_share,
    p_release, 'onet', now(), null
  from pg_temp.incoming i
  on conflict (onet_code) do update
  set title = excluded.title,
      description = excluded.description,
      job_zone = excluded.job_zone,
      education_level = excluded.education_level,
      education_share = excluded.education_share,
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

-- create or replace keeps the old grants, but say it again for clarity.
revoke execute on function ingest.merge_occupations(bigint, text) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_occupations(bigint, text) to importer;
