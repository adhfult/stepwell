-- Tests for Career Explorer's database rules: reference tables, merging
-- details, retiring careers, search, and saved careers.
-- Run with: npm run test:db. Everything is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

-- Start from an empty pipeline, whatever local imports have loaded.
delete from public.saved_items;
delete from public.career_licenses;
delete from public.career_certifications;
delete from public.occupations;
delete from ingest.import_runs;
update public.sources set last_success_at = null, last_etag = null, last_release = null;

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.occupation_titles'::regclass, 'public.occupation_details'::regclass,
                 'public.occupation_related'::regclass, 'public.saved_items'::regclass)),
  'the new tables have Row Level Security enabled'
);

-- A first import with details, titles and related careers
set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('onet');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation","source_record_id":"29-1141.00","status":"valid","payload":{
      "onet_code":"29-1141.00","title":"Registered Nurses","description":"Care for patients.",
      "job_zone":3,"education_level":6,"education_share":62,
      "tasks":["Monitor patients."],"skills":["Service Orientation"],
      "titles":[{"kind":"reported","title":"RN","featured":true},{"kind":"alternate","title":"Nurse"}],
      "related":[{"code":"29-1171.00","tier":"primary_short","rank":1},
                 {"code":"99-9999.00","tier":"primary_short","rank":2}]}},
    {"kind":"occupation","source_record_id":"29-1171.00","status":"valid","payload":{
      "onet_code":"29-1171.00","title":"Nurse Practitioners","description":"Diagnose and treat.",
      "titles":[],"related":[{"code":"29-1141.00","tier":"primary_long","rank":1}]}},
    {"kind":"occupation","source_record_id":"29-1141.01","status":"valid","payload":{
      "onet_code":"29-1141.01","title":"Acute Care Nurses","description":"Care in emergencies.",
      "titles":[{"kind":"alternate","title":"Nurse"}]}},
    {"kind":"occupation","source_record_id":"15-1252.00","status":"valid","payload":{
      "onet_code":"15-1252.00","title":"Software Developers","description":"Build software.",
      "titles":[{"kind":"alternate","title":"Application Developer"},{"kind":"alternate","title":"100%% Remote Coder"}]}},
    {"kind":"occupation","source_record_id":"47-2111.00","status":"valid","payload":{
      "onet_code":"47-2111.00","title":"Electricians","description":"Install wiring."}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages occupations with details'
);
select results_eq(
  format($$ select * from ingest.merge_occupations(%s, '31.0') $$, (select run_id from t_run)),
  $$ values (5, 0, 0) $$,
  'the merge adds all five careers'
);
select lives_ok(
  format($$ select ingest.finish_run(%s, 'succeeded', 5, 0, 5, 0, 0, '31.0') $$, (select run_id from t_run)),
  'the first run finishes'
);
reset role;

select is(
  (select job_zone || ' ' || education_level || ' ' || education_share
   from public.occupations where onet_code = '29-1141.00'),
  '3 6 62',
  'job zone and typical education are stored'
);
select is(
  (select tasks ->> 0 from public.occupation_details where onet_code = '29-1141.00'),
  'Monitor patients.',
  'tasks are stored'
);
select is(
  (select count(*)::int from public.occupation_details),
  5,
  'every career gets a details row, even with no tasks'
);
select is(
  (select string_agg(kind || ':' || title || ':' || featured, ', ' order by kind, title)
   from public.occupation_titles where onet_code = '29-1141.00'),
  'alternate:Nurse:false, reported:RN:true',
  'reported and alternate titles are stored'
);
select is(
  (select string_agg(related_code, ', ') from public.occupation_related where onet_code = '29-1141.00'),
  '29-1171.00',
  'a related code missing from the release is skipped'
);

-- Anyone can read the reference tables
set local role anon;
select is(
  (select count(*)::int from public.occupation_titles) > 0
  and (select count(*)::int from public.occupation_details) > 0
  and (select count(*)::int from public.occupation_related) > 0,
  true,
  'anon can read titles, details and related careers'
);
select throws_ok(
  $$ insert into public.occupation_titles (onet_code, kind, title) values ('47-2111.00', 'alternate', 'x') $$,
  '42501', null,
  'anon cannot write titles'
);

-- Search
select is(
  (select array_agg(onet_code) from (select onet_code from public.search_occupations('nurse') limit 3) s),
  array['29-1141.00', '29-1141.01', '29-1171.00'],
  'nurse: exact alternate titles first, the general career before its specialty, then title matches'
);
select is(
  (select onet_code from public.search_occupations('Electricians') limit 1),
  '47-2111.00',
  'an exact title comes first'
);
select is(
  (select matched_title from public.search_occupations('application dev') limit 1),
  'Application Developer',
  'a match on an alternate title says which title matched'
);
select is(
  (select onet_code from public.search_occupations('electrcian') limit 1),
  '47-2111.00',
  'a close spelling still finds the career'
);
select is(
  (select array_agg(onet_code) from public.search_occupations('100%')),
  array['15-1252.00'],
  'percent signs are matched literally'
);
select is(
  (select count(*)::int from public.search_occupations('%')),
  1,
  'a lone % is not a wildcard'
);
select is(
  (select count(*)::int from public.search_occupations('   ')),
  0,
  'a blank query finds nothing'
);
reset role;

-- Saved careers
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');
insert into public.saved_items (user_id, onet_code) values
  ('22222222-2222-2222-2222-222222222222', '47-2111.00');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.saved_items (onet_code) values ('29-1141.00') $$,
  'a student saves a career'
);
select is(
  (select user_id::text from public.saved_items),
  '11111111-1111-1111-1111-111111111111',
  'the saved row belongs to the student, and they see only their own'
);
select throws_ok(
  $$ insert into public.saved_items (user_id, onet_code)
     values ('22222222-2222-2222-2222-222222222222', '15-1252.00') $$,
  '42501', null,
  'a student cannot save for someone else'
);
select throws_ok(
  $$ insert into public.saved_items (onet_code) values ('29-1141.00') $$,
  '23505', null,
  'saving the same career twice is refused'
);
select throws_ok(
  $$ insert into public.saved_items (onet_code) values (null) $$,
  '23514', null,
  'a saved item must link to exactly one thing'
);
select throws_ok(
  $$ update public.saved_items set onet_code = '15-1252.00' $$,
  '42501', null,
  'saved items cannot be changed, only removed'
);
delete from public.saved_items where onet_code in ('47-2111.00', '29-1141.00');
reset role;
select is(
  (select string_agg(user_id::text || ' ' || onet_code, ', ') from public.saved_items),
  '22222222-2222-2222-2222-222222222222 47-2111.00',
  'a student removes their own saved career, never someone else''s'
);
set local role authenticated;
select lives_ok(
  $$ insert into public.saved_items (onet_code) values ('29-1141.00') $$,
  'and can save it again'
);
reset role;

set local role anon;
select throws_ok(
  $$ select * from public.saved_items $$,
  '42501', null,
  'anonymous visitors cannot read saved items'
);
reset role;

-- A new release without Registered Nurses retires it; the saved row survives
set local role importer;
create temporary table t_run2 on commit drop as select * from ingest.start_run('onet');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation","source_record_id":"29-1171.00","status":"valid","payload":{
      "onet_code":"29-1171.00","title":"Nurse Practitioners","description":"Diagnose and treat."}},
    {"kind":"occupation","source_record_id":"29-1141.01","status":"valid","payload":{
      "onet_code":"29-1141.01","title":"Acute Care Nurses","description":"Care in emergencies."}},
    {"kind":"occupation","source_record_id":"15-1252.00","status":"valid","payload":{
      "onet_code":"15-1252.00","title":"Software Developers","description":"Build software."}},
    {"kind":"occupation","source_record_id":"47-2111.00","status":"valid","payload":{
      "onet_code":"47-2111.00","title":"Electricians","description":"Install wiring."}}
  ]'::jsonb) $$, (select run_id from t_run2)),
  'a second release is staged'
);
select results_eq(
  format($$ select * from ingest.merge_occupations(%s, '31.1') $$, (select run_id from t_run2)),
  $$ values (0, 0, 1) $$,
  'the merge counts the dropped career as removed'
);
reset role;

select ok(
  (select retired_at is not null from public.occupations where onet_code = '29-1141.00'),
  'the dropped career is retired, not deleted'
);
select is(
  (select count(*)::int from public.saved_items where onet_code = '29-1141.00'),
  1,
  'the student''s saved career survives'
);
select is(
  (select count(*)::int from public.search_occupations('registered nurses')),
  0,
  'a retired career leaves search'
);

select * from finish();
rollback;
