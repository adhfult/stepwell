-- Scheduling support for import jobs: which sources are due, which are
-- stale, and a daily clean-up of staged records.
-- Spec: docs/specs/data-pipeline.md (Schedule). v1 expansion, Section 4.2.

-- Sources whose refresh interval has passed since their last success.
create function ingest.due_sources()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.sources s
  where s.allowed
    and (s.last_success_at is null or s.last_success_at + s.refresh_interval <= now())
  order by s.id;
$$;

-- Freshness check: active sources with no success in twice their interval.
create function ingest.stale_sources()
returns table (source_id text, last_success_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.last_success_at from public.sources s
  where s.allowed
    and (s.last_success_at is null or s.last_success_at < now() - 2 * s.refresh_interval)
  order by s.id;
$$;

-- Staged records (including rejected ones, which may quote page text) are
-- kept 30 days. Run history stays: it's one small row per run, and the
-- circuit breaker compares against the last successful run, which for a
-- monthly source can be older than 30 days.
create function ingest.purge_staged_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from ingest.staged_records where created_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function
  ingest.due_sources(),
  ingest.stale_sources(),
  ingest.purge_staged_records()
from public, anon, authenticated, service_role;
grant execute on function ingest.due_sources(), ingest.stale_sources() to importer;

-- pg_cron runs the clean-up inside the database, so no key leaves it.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'ingest-purge-staged-records',
  '23 4 * * *',
  'select ingest.purge_staged_records()'
);
