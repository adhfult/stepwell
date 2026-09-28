-- Tests for import scheduling: due and stale sources, and the staged-record
-- clean-up. Run with: npm run test:db. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

update public.sources set last_success_at = null where id = 'onet';
select is(
  (select array_agg(s) from ingest.due_sources() s),
  array['onet'],
  'a source that never succeeded is due'
);
select is(
  (select array_agg(source_id) from ingest.stale_sources()),
  array['onet'],
  'a source that never succeeded is stale'
);

update public.sources set last_success_at = now() - interval '20 days' where id = 'onet';
select is(
  (select count(*)::int from ingest.due_sources()),
  0,
  'a monthly source that succeeded 20 days ago is not due'
);

update public.sources set last_success_at = now() - interval '40 days' where id = 'onet';
select is(
  (select array_agg(s) from ingest.due_sources() s),
  array['onet'],
  'a monthly source that succeeded 40 days ago is due'
);
select is(
  (select count(*)::int from ingest.stale_sources()),
  0,
  'but it is not stale yet'
);

update public.sources set last_success_at = now() - interval '70 days' where id = 'onet';
select is(
  (select array_agg(source_id) from ingest.stale_sources()),
  array['onet'],
  'a monthly source with no success in over two months is stale'
);

update public.sources set allowed = false where id = 'onet';
select is(
  (select count(*)::int from ingest.due_sources()) + (select count(*)::int from ingest.stale_sources()),
  0,
  'a paused source is neither due nor stale'
);

-- Clean-up
insert into ingest.import_runs (id, source_id, status) overriding system value
  values (-1, 'onet', 'failed');
insert into ingest.staged_records (run_id, kind, source_record_id, payload, status, created_at) values
  (-1, 'occupation', 'old', '{}', 'valid', now() - interval '31 days'),
  (-1, 'occupation', 'new', '{}', 'valid', now() - interval '29 days');
select is(ingest.purge_staged_records(), 1, 'the clean-up deletes staged records over 30 days old');
select is(
  (select array_agg(source_record_id) from ingest.staged_records where run_id = -1),
  array['new'],
  'and keeps newer ones'
);

set local role importer;
select throws_ok(
  $$ select ingest.purge_staged_records() $$,
  '42501', null,
  'importer cannot run the clean-up'
);
reset role;
set local role authenticated;
select throws_ok(
  $$ select * from ingest.due_sources() $$,
  '42501', null,
  'a signed-in student cannot list due sources'
);
reset role;

select is(
  (select schedule from cron.job where jobname = 'ingest-purge-staged-records'),
  '23 4 * * *',
  'the clean-up is scheduled daily'
);

select * from finish();
rollback;
