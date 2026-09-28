-- Data pipeline foundation: sources, import runs, staging, occupations, and
-- the importer role that import jobs log in as.
-- Spec: docs/specs/data-pipeline.md. Decisions 0003, 0007 and 0008.
--
-- Import jobs never touch tables directly. They call the ingest.* functions
-- below, which check the source's permission, stage records and merge them
-- into public tables in one transaction.

-- Sources: every place data comes from (public: pages show attribution) ----

create table public.sources (
  id text primary key
    constraint sources_id_valid check (id ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  kind text not null
    constraint sources_kind_valid check (kind in ('api', 'dataset', 'scrape', 'manual')),
  homepage text not null
    constraint sources_homepage_https check (homepage like 'https://%'),
  terms_url text
    constraint sources_terms_url_https check (terms_url like 'https://%'),
  -- The runner refuses a source whose terms weren't checked in 12 months.
  terms_checked_at date,
  allowed boolean not null default false,
  paused_reason text,
  refresh_interval interval not null,
  -- Shown under any number that comes from this source.
  attribution text not null,
  last_success_at timestamptz,
  -- What the last successful run saw, so an unchanged file can be skipped.
  last_etag text,
  last_release text
);

comment on table public.sources is
  'Every data source, its terms check and refresh interval. Written by migrations and ingest functions.';

alter table public.sources enable row level security;

create policy "Anyone can read sources"
  on public.sources for select
  to anon, authenticated
  using (true);

revoke all on table public.sources from anon, authenticated;
grant select on table public.sources to anon, authenticated;

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'onet',
  'O*NET Database',
  'dataset',
  'https://www.onetcenter.org/database.html',
  'https://www.onetcenter.org/license_db.html',
  '2026-09-28',
  true,
  interval '1 month',
  'O*NET Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET is a trademark of USDOL/ETA.'
);

-- Occupations (minimal; Career Explorer adds columns) ----------------------

create table public.occupations (
  onet_code text primary key
    constraint occupations_onet_code_valid check (onet_code ~ '^\d{2}-\d{4}\.\d{2}$'),
  -- The 6-digit SOC code, used to join to the college program crosswalk.
  soc_code text generated always as (left(onet_code, 7)) stored,
  title text not null
    constraint occupations_title_valid check (char_length(title) between 1 and 200),
  description text not null
    constraint occupations_description_valid check (char_length(description) between 1 and 4000),
  onet_release text not null
    constraint occupations_onet_release_valid check (onet_release ~ '^\d+\.\d+$'),
  source_id text not null default 'onet' references public.sources (id),
  retrieved_at timestamptz not null
);

comment on table public.occupations is
  'Careers from the O*NET Database. Written only by ingest.merge_occupations().';

alter table public.occupations enable row level security;

create policy "Anyone can read occupations"
  on public.occupations for select
  to anon, authenticated
  using (true);

revoke all on table public.occupations from anon, authenticated;
grant select on table public.occupations to anon, authenticated;

-- The ingest schema: not exposed to the Data API ---------------------------

create schema ingest;
revoke all on schema ingest from public, anon, authenticated, service_role;

create table ingest.import_runs (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    constraint import_runs_status_valid check (
      status in ('running', 'succeeded', 'failed', 'aborted', 'unchanged')
    ),
  seen integer not null default 0,
  rejected integer not null default 0,
  added integer not null default 0,
  changed integer not null default 0,
  removed integer not null default 0,
  release text,
  etag text,
  error text
);

create index import_runs_source_started on ingest.import_runs (source_id, started_at desc);

create table ingest.staged_records (
  id bigint generated always as identity primary key,
  run_id bigint not null references ingest.import_runs (id) on delete cascade,
  kind text not null
    constraint staged_records_kind_valid check (kind in ('occupation')),
  source_record_id text not null,
  payload jsonb not null,
  status text not null
    constraint staged_records_status_valid check (status in ('valid', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  constraint staged_records_one_per_run unique (run_id, kind, source_record_id),
  constraint staged_records_reason_when_rejected check (
    (status = 'rejected') = (reject_reason is not null)
  )
);

revoke all on all tables in schema ingest from public, anon, authenticated, service_role;

-- The importer role --------------------------------------------------------
-- Roles belong to the whole server, so a local reset can find it already
-- there. No password here: seed.sql sets one locally; the owner sets the
-- cloud one in the SQL editor (decision 0008).

do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'importer') then
    create role importer login noinherit;
  end if;
end;
$$;

-- Lets postgres switch to importer (tests use `set role importer`). Postgres
-- 16+ gives a role's creator only admin rights over it by default.
grant importer to postgres with inherit false;

grant usage on schema ingest to importer;

-- Functions (security definer: they run as their owner, so importer needs
-- no table rights; search_path is empty so every name is spelled out) -----

-- Opens a run if the source may be read. Returns refused_reason instead of
-- raising, so the refusal is saved as a failed run.
create function ingest.start_run(p_source text)
returns table (
  run_id bigint,
  refused_reason text,
  last_etag text,
  last_release text,
  last_valid integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.sources;
  v_reason text;
  v_run_id bigint;
begin
  select * into v_source from public.sources s where s.id = p_source;
  if not found then
    raise exception 'Unknown source %', p_source;
  end if;

  -- A run still "running" after 2 hours crashed; close it so it can't block.
  update ingest.import_runs r
  set status = 'failed', finished_at = now(), error = 'Timed out'
  where r.source_id = p_source and r.status = 'running'
    and r.started_at < now() - interval '2 hours';

  if not v_source.allowed then
    v_reason := 'Source not allowed: ' || coalesce(v_source.paused_reason, 'no reason recorded');
  elsif v_source.terms_checked_at is null
     or v_source.terms_checked_at < current_date - interval '12 months' then
    v_reason := 'Re-check terms: last checked ' || coalesce(v_source.terms_checked_at::text, 'never');
  elsif exists (
    select from ingest.import_runs r where r.source_id = p_source and r.status = 'running'
  ) then
    v_reason := 'Another run of this source is still running';
  end if;

  insert into ingest.import_runs (source_id, status, finished_at, error)
  values (
    p_source,
    case when v_reason is null then 'running' else 'failed' end,
    case when v_reason is null then null else now() end,
    v_reason
  )
  returning id into v_run_id;

  return query
  select
    v_run_id,
    v_reason,
    v_source.last_etag,
    v_source.last_release,
    (select r.seen - r.rejected from ingest.import_runs r
     where r.source_id = p_source and r.status = 'succeeded'
     order by r.started_at desc limit 1);
end;
$$;

-- Adds a batch of records to a running run. p_records is a JSON array of
-- {kind, source_record_id, payload, status, reject_reason}.
create function ingest.stage_records(p_run_id bigint, p_records jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select from ingest.import_runs r where r.id = p_run_id and r.status = 'running'
  ) then
    raise exception 'Run % is not running', p_run_id;
  end if;

  insert into ingest.staged_records (run_id, kind, source_record_id, payload, status, reject_reason)
  select p_run_id, x.kind, x.source_record_id, x.payload, x.status, x.reject_reason
  from jsonb_to_recordset(p_records)
    as x(kind text, source_record_id text, payload jsonb, status text, reject_reason text);
end;
$$;

-- Moves a run's valid occupations into public.occupations. A function call
-- is one transaction: if anything fails, nothing changes. Rows missing from
-- the new release are deleted (nothing references occupations yet).
create function ingest.merge_occupations(p_run_id bigint, p_release text)
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
    s.payload ->> 'description' as description
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

  delete from public.occupations o
  where o.source_id = 'onet'
    and not exists (select from pg_temp.incoming i where i.onet_code = o.onet_code);
  get diagnostics v_removed = row_count;

  insert into public.occupations (onet_code, title, description, onet_release, source_id, retrieved_at)
  select i.onet_code, i.title, i.description, p_release, 'onet', now()
  from pg_temp.incoming i
  on conflict (onet_code) do update
  set title = excluded.title,
      description = excluded.description,
      onet_release = excluded.onet_release,
      retrieved_at = excluded.retrieved_at;

  drop table pg_temp.incoming;

  return query select v_added, v_changed, v_removed;
end;
$$;

-- Closes a run. A succeeded or unchanged run also updates the source's
-- last success, ETag and release.
create function ingest.finish_run(
  p_run_id bigint,
  p_status text,
  p_seen integer default 0,
  p_rejected integer default 0,
  p_added integer default 0,
  p_changed integer default 0,
  p_removed integer default 0,
  p_release text default null,
  p_etag text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_id text;
begin
  update ingest.import_runs r
  set status = p_status, finished_at = now(),
      seen = p_seen, rejected = p_rejected,
      added = p_added, changed = p_changed, removed = p_removed,
      release = p_release, etag = p_etag, error = p_error
  where r.id = p_run_id and r.status = 'running'
  returning r.source_id into v_source_id;

  if v_source_id is null then
    raise exception 'Run % is not running', p_run_id;
  end if;

  if p_status in ('succeeded', 'unchanged') then
    update public.sources s
    set last_success_at = now(),
        last_etag = coalesce(p_etag, s.last_etag),
        last_release = coalesce(p_release, s.last_release)
    where s.id = v_source_id;
  end if;
end;
$$;

-- Stops a source, for example when robots.txt starts disallowing our pages.
-- Its data stays until a person reviews it.
create function ingest.pause_source(p_source text, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sources set allowed = false, paused_reason = p_reason where id = p_source;
$$;

revoke execute on all functions in schema ingest from public, anon, authenticated, service_role;
grant execute on function
  ingest.start_run(text),
  ingest.stage_records(bigint, jsonb),
  ingest.merge_occupations(bigint, text),
  ingest.finish_run(bigint, text, integer, integer, integer, integer, integer, text, text, text),
  ingest.pause_source(text, text)
to importer;
