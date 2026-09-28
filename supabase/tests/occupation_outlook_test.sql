-- Tests for pay and outlook: merging, public read, and value rules.
-- Run with: npm run test:db. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

delete from public.occupation_outlook;
delete from ingest.import_runs where source_id = 'onet_outlook';
insert into public.occupations (onet_code, title, description, onet_release, retrieved_at)
values ('00-0001.00', 'Test Career A', 'A.', '31.0', now()),
       ('00-0002.00', 'Test Career B', 'B.', '31.0', now())
on conflict do nothing;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.occupation_outlook'::regclass),
  'occupation_outlook has Row Level Security enabled'
);

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('onet_outlook');
select is((select refused_reason from t_run), null, 'the outlook source may run');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation_outlook","source_record_id":"00-0001.00","status":"valid","payload":{
      "onet_code":"00-0001.00","outlook":"bright","bright_reasons":["grow","openings"],"wage_soc_code":"00-0001",
      "annual_low":40050,"annual_median":61010,"annual_high":95210,"or_more":[]}},
    {"kind":"occupation_outlook","source_record_id":"00-0002.00","status":"valid","payload":{
      "onet_code":"00-0002.00","outlook":"below_average","hourly_low":12.5,"hourly_median":18.25,
      "hourly_high":115,"or_more":["hourly_high"]}},
    {"kind":"occupation_outlook","source_record_id":"99-9999.00","status":"valid","payload":{
      "onet_code":"99-9999.00","outlook":"average"}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages outlook records'
);
select results_eq(
  format($$ select * from ingest.merge_occupation_outlook(%s) $$, (select run_id from t_run)),
  $$ values (2, 0, 0) $$,
  'the merge adds the two known careers and skips an unknown code'
);
reset role;

select is(
  (select annual_median || ' ' || outlook || ' ' || array_to_string(bright_reasons, ',')
   from public.occupation_outlook where onet_code = '00-0001.00'),
  '61010 bright grow,openings',
  'annual pay, outlook and reasons are stored'
);
select is(
  (select hourly_median::text || ' ' || array_to_string(or_more, ',')
   from public.occupation_outlook where onet_code = '00-0002.00'),
  '18.25 hourly_high',
  'hourly pay keeps cents, and "or more" figures are marked'
);

set local role anon;
select is(
  (select count(*)::int from public.occupation_outlook where onet_code like '00-%'),
  2,
  'anyone can read pay and outlook'
);
select throws_ok(
  $$ delete from public.occupation_outlook $$,
  '42501', null,
  'anon cannot change pay and outlook'
);
reset role;

select throws_ok(
  $$ update public.occupation_outlook set bright_reasons = '{sparkly}' where onet_code = '00-0001.00' $$,
  '23514', null,
  'only known Bright Outlook reasons are allowed'
);

-- A second run without career B removes its row
update ingest.import_runs set status = 'failed' where status = 'running';
set local role importer;
create temporary table t_run2 on commit drop as select * from ingest.start_run('onet_outlook');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation_outlook","source_record_id":"00-0001.00","status":"valid","payload":{
      "onet_code":"00-0001.00","outlook":"average","annual_median":62000}}
  ]'::jsonb) $$, (select run_id from t_run2)),
  'a second run is staged'
);
select results_eq(
  format($$ select * from ingest.merge_occupation_outlook(%s) $$, (select run_id from t_run2)),
  $$ values (0, 1, 1) $$,
  'the merge counts one changed and one removed career'
);
reset role;

select * from finish();
rollback;
