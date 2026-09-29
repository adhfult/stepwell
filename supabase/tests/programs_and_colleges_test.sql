-- Tests for programs and colleges: crosswalk and Scorecard merges, stable
-- program ids, and colleges_for_career(). Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

delete from public.saved_items;
delete from public.occupations;
delete from public.institutions;
delete from ingest.import_runs where source_id in ('onet_cip', 'scorecard');
insert into public.occupations (onet_code, title, description, onet_release, retrieved_at)
values ('29-1141.00', 'Registered Nurses', 'Care.', '31.0', now()),
       ('47-2111.00', 'Electricians', 'Wire.', '31.0', now());

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.occupation_programs'::regclass, 'public.institutions'::regclass, 'public.programs'::regclass)),
  'the new tables have Row Level Security enabled'
);

-- Crosswalk
set local role importer;
create temporary table t_cw on commit drop as select * from ingest.start_run('onet_cip');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation_program","source_record_id":"1","status":"valid","payload":{"onet_code":"29-1141.00","cip6":"51.3801","cip_title":"Registered Nursing/Registered Nurse"}},
    {"kind":"occupation_program","source_record_id":"2","status":"valid","payload":{"onet_code":"29-1141.00","cip6":"51.3818","cip_title":"Nursing Practice"}},
    {"kind":"occupation_program","source_record_id":"3","status":"valid","payload":{"onet_code":"47-2111.00","cip6":"46.0302","cip_title":"Electrician"}},
    {"kind":"occupation_program","source_record_id":"4","status":"valid","payload":{"onet_code":"99-9999.00","cip6":"01.0000","cip_title":"Unknown career"}}
  ]'::jsonb) $$, (select run_id from t_cw)),
  'importer stages crosswalk rows'
);
select results_eq(
  format($$ select * from ingest.merge_occupation_programs(%s) $$, (select run_id from t_cw)),
  $$ values (3, 0, 0) $$,
  'the crosswalk merge skips careers we don''t have'
);
reset role;
select is(
  (select string_agg(distinct cip4, ',') from public.occupation_programs where onet_code = '29-1141.00'),
  '51.38',
  'the 4-digit CIP family is computed'
);

-- Colleges and programs
set local role importer;
create temporary table t_sc on commit drop as select * from ingest.start_run('scorecard');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"institution","source_record_id":"1","status":"valid","payload":{
      "unitid":1,"name":"Coastal College","city":"Portland","state":"OR","ownership":"public",
      "website":"https://coastal.example.edu","net_price":9000,"graduation_rate":0.61,"students":5000,
      "programs":[
        {"cip4":"51.38","credential_level":2,"title":"Registered Nursing.","credential_title":"Associate''s Degree","earnings_4yr":81000,"graduates":120},
        {"cip4":"51.38","credential_level":3,"title":"Registered Nursing.","credential_title":"Bachelor''s Degree","earnings_1yr":70000,"median_debt":24000,"graduates":80},
        {"cip4":"46.03","credential_level":1,"title":"Electrical and Power Transmission Installers.","credential_title":"Undergraduate Certificate or Diploma","graduates":30}
      ]}},
    {"kind":"institution","source_record_id":"2","status":"valid","payload":{
      "unitid":2,"name":"Mountain University","city":"Denver","state":"CO","ownership":"private_nonprofit",
      "programs":[
        {"cip4":"51.38","credential_level":3,"title":"Registered Nursing.","credential_title":"Bachelor''s Degree","earnings_4yr":90000,"graduates":200}
      ]}}
  ]'::jsonb) $$, (select run_id from t_sc)),
  'importer stages colleges with their programs'
);
select results_eq(
  format($$ select * from ingest.merge_institutions(%s) $$, (select run_id from t_sc)),
  $$ values (2, 0, 0) $$,
  'the merge adds both colleges'
);
reset role;
select is((select count(*)::int from public.programs), 4, 'every program is stored');
create temporary table t_ids on commit drop as select id, unitid, cip4, credential_level from public.programs;

-- Anyone can search colleges for a career
set local role anon;
select is(
  (select array_agg(college || ' ' || credential_level) from public.colleges_for_career('29-1141.00')),
  array['Mountain University 3', 'Coastal College 2', 'Coastal College 3'],
  'nursing programs, best earnings first (4-year, else 1-year)'
);
select is(
  (select array_agg(college) from public.colleges_for_career('29-1141.00', 'OR')),
  array['Coastal College', 'Coastal College'],
  'the state filter keeps one state'
);
select is(
  (select array_agg(college || ' ' || credential_level) from public.colleges_for_career('29-1141.00', null, 'associate')),
  array['Coastal College 2'],
  'the credential filter keeps one level'
);
select is(
  (select array_agg(program) from public.colleges_for_career('47-2111.00')),
  array['Electrical and Power Transmission Installers.'],
  'a different career finds its own programs'
);
select throws_ok(
  $$ select * from public.colleges_for_career('29-1141.00', 'Oregon') $$,
  'P0001', 'State must be a two-letter code',
  'a bad state is refused'
);
select throws_ok(
  $$ select * from public.colleges_for_career('29-1141.00', null, 'phd') $$,
  'P0001', 'Unknown credential level',
  'a bad level is refused'
);
select throws_ok(
  $$ delete from public.programs $$,
  '42501', null,
  'anon cannot change programs'
);
reset role;

-- A second run: Mountain closes, Coastal drops its certificate and changes a figure
update ingest.import_runs set status = 'failed' where status = 'running' and source_id = 'scorecard';
set local role importer;
create temporary table t_sc2 on commit drop as select * from ingest.start_run('scorecard');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"institution","source_record_id":"1","status":"valid","payload":{
      "unitid":1,"name":"Coastal College","city":"Portland","state":"OR","ownership":"public","net_price":9500,
      "programs":[
        {"cip4":"51.38","credential_level":2,"title":"Registered Nursing.","credential_title":"Associate''s Degree","earnings_4yr":83000,"graduates":125},
        {"cip4":"51.38","credential_level":3,"title":"Registered Nursing.","credential_title":"Bachelor''s Degree","earnings_1yr":71000,"graduates":85}
      ]}}
  ]'::jsonb) $$, (select run_id from t_sc2)),
  'a second Scorecard run is staged'
);
select results_eq(
  format($$ select * from ingest.merge_institutions(%s) $$, (select run_id from t_sc2)),
  $$ values (0, 1, 1) $$,
  'the merge counts one changed and one removed college'
);
reset role;
select is(
  (select count(*)::int from public.programs p join t_ids t using (id)),
  2,
  'the two remaining programs keep their ids'
);
select is(
  (select earnings_4yr from public.programs where unitid = 1 and credential_level = 2),
  83000,
  'and their figures are updated'
);

select * from finish();
rollback;
