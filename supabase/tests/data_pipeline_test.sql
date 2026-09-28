-- Tests for the data pipeline: who can reach what, the permission gate on
-- starting a run, and merging occupations.
-- Run with: npm run test:db (needs the local Supabase: npm run db:start).
-- Everything runs in one transaction and is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Tables and public access
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sources'::regclass),
  'sources has Row Level Security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.occupations'::regclass),
  'occupations has Row Level Security enabled'
);

set local role anon;
select is(
  (select count(*)::int from public.sources where id = 'onet'),
  1,
  'anon can read sources'
);
select lives_ok(
  $$ select count(*) from public.occupations $$,
  'anon can read occupations'
);
select throws_ok(
  $$ insert into public.occupations (onet_code, title, description, onet_release, retrieved_at)
     values ('11-1011.00', 'x', 'x', '31.0', now()) $$,
  '42501', null,
  'anon cannot write occupations'
);
select throws_ok(
  $$ select * from ingest.import_runs $$,
  '42501', null,
  'anon cannot reach the ingest schema'
);
select throws_ok(
  $$ select * from ingest.start_run('onet') $$,
  '42501', null,
  'anon cannot start a run'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select * from ingest.start_run('onet') $$,
  '42501', null,
  'a signed-in student cannot start a run'
);
select throws_ok(
  $$ update public.sources set allowed = false $$,
  '42501', null,
  'a signed-in student cannot change sources'
);
reset role;

-- The importer role reaches nothing but the ingest functions
-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;
set local role importer;
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501', null,
  'importer cannot read profiles'
);
select throws_ok(
  $$ select count(*) from auth.users $$,
  '42501', null,
  'importer cannot read auth.users'
);
select throws_ok(
  $$ insert into public.occupations (onet_code, title, description, onet_release, retrieved_at)
     values ('11-1011.00', 'x', 'x', '31.0', now()) $$,
  '42501', null,
  'importer cannot write occupations directly'
);
select throws_ok(
  $$ select * from ingest.staged_records $$,
  '42501', null,
  'importer cannot read staging tables directly'
);
select throws_ok(
  $$ select public.delete_my_account() $$,
  '42501', null,
  'importer cannot call delete_my_account()'
);

-- A first run: start, stage, merge, finish
create temporary table t_run on commit drop as
  select * from ingest.start_run('onet');

select is(
  (select refused_reason from t_run),
  null,
  'an allowed source with fresh terms starts'
);
select is(
  (select last_valid from t_run),
  null,
  'a source that never succeeded has no previous count'
);
select is(
  (select refused_reason from ingest.start_run('onet')),
  'Another run of this source is still running',
  'a second run of the same source is refused'
);

select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation","source_record_id":"11-1011.00","status":"valid",
     "payload":{"onet_code":"11-1011.00","title":"Chief Executives","description":"Lead."}},
    {"kind":"occupation","source_record_id":"29-1141.00","status":"valid",
     "payload":{"onet_code":"29-1141.00","title":"Registered Nurses","description":"Care."}},
    {"kind":"occupation","source_record_id":"bad","status":"rejected","reject_reason":"bad code",
     "payload":{"onet_code":"bad"}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer can stage records'
);
select results_eq(
  format($$ select * from ingest.merge_occupations(%s, '31.0') $$, (select run_id from t_run)),
  $$ values (2, 0, 0) $$,
  'merging adds the valid occupations only'
);
select lives_ok(
  format($$ select ingest.finish_run(%s, 'succeeded', 3, 1, 2, 0, 0, '31.0', '"etag-1"') $$,
         (select run_id from t_run)),
  'importer can finish the run'
);
reset role;

select is(
  (select soc_code from public.occupations where onet_code = '29-1141.00'),
  '29-1141',
  'the SOC code is computed from the O*NET code'
);
select is(
  (select last_etag || ' ' || last_release from public.sources where id = 'onet'),
  '"etag-1" 31.0',
  'a successful run records its ETag and release on the source'
);

-- A second run: one title changed, one occupation dropped, one new
set local role importer;
create temporary table t_run2 on commit drop as
  select * from ingest.start_run('onet');
select is(
  (select last_valid from t_run2),
  2,
  'the next run knows how many valid records the last success had'
);
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation","source_record_id":"11-1011.00","status":"valid",
     "payload":{"onet_code":"11-1011.00","title":"Chief Executive Officers","description":"Lead."}},
    {"kind":"occupation","source_record_id":"15-1252.00","status":"valid",
     "payload":{"onet_code":"15-1252.00","title":"Software Developers","description":"Build."}}
  ]'::jsonb) $$, (select run_id from t_run2)),
  'second run stages records'
);
select results_eq(
  format($$ select * from ingest.merge_occupations(%s, '31.1') $$, (select run_id from t_run2)),
  $$ values (1, 1, 1) $$,
  'merging counts added, changed and removed occupations'
);
reset role;
select is(
  (select string_agg(onet_code || ' ' || onet_release, ', ' order by onet_code) from public.occupations),
  '11-1011.00 31.1, 15-1252.00 31.1',
  'occupations now match the new release exactly'
);

-- Refusals
update ingest.import_runs set status = 'failed' where status = 'running';
set local role importer;
select throws_ok(
  format($$ select * from ingest.merge_occupations(%s, '31.1') $$,
         (select id from ingest.start_run('onet') as s(id, a, b, c, d))),
  'P0001', 'Refusing to merge zero occupations',
  'a run with no valid records is never merged'
);
reset role;

update ingest.import_runs set status = 'failed' where status = 'running';
update public.sources set terms_checked_at = current_date - interval '13 months' where id = 'onet';
select alike(
  (select refused_reason from ingest.start_run('onet')),
  'Re-check terms%',
  'a source whose terms were checked over 12 months ago is refused'
);

set local role importer;
select lives_ok(
  $$ select ingest.pause_source('onet', 'robots.txt now disallows the files') $$,
  'importer can pause a source'
);
reset role;
select is(
  (select refused_reason from ingest.start_run('onet')),
  'Source not allowed: robots.txt now disallows the files',
  'a paused source is refused with its reason'
);

select is(
  (select count(*)::int from ingest.import_runs where status = 'failed' and error like 'Source not allowed%'),
  1,
  'a refusal is saved as a failed run'
);

select * from finish();
rollback;
