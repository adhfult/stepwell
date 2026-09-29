-- Tests for AP suggestions: the hand-entered data, knowledge merging, and
-- ap_courses_for_career(). Run with: npm run test:db. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

select is((select count(*)::int from public.knowledge_areas), 33, 'all 33 O*NET knowledge areas are listed');
select is((select count(*)::int from public.ap_courses), 42, 'all 42 AP courses are listed');
select is(
  (select count(*)::int from public.knowledge_areas a
   where not exists (select from public.knowledge_ap_map m where m.area_id = a.id)),
  4,
  'four areas have no fitting AP course'
);

-- Knowledge arrives with the O*NET merge
delete from public.saved_items;
delete from public.occupations;
delete from ingest.import_runs where source_id = 'onet';
update public.sources set last_success_at = null, last_etag = null, last_release = null where id = 'onet';

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('onet');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"occupation","source_record_id":"29-1141.00","status":"valid","payload":{
      "onet_code":"29-1141.00","title":"Registered Nurses","description":"Care.",
      "knowledge":[
        {"area_id":"2.C.4.e","importance":4.58},
        {"area_id":"2.C.5.a","importance":4.36},
        {"area_id":"2.C.7.a","importance":4.18},
        {"area_id":"2.C.1.e","importance":4.40},
        {"area_id":"2.C.4.d","importance":3.40},
        {"area_id":"9.Z.9","importance":5}
      ]}},
    {"kind":"occupation","source_record_id":"41-2031.00","status":"valid","payload":{
      "onet_code":"41-2031.00","title":"Retail Salespersons","description":"Sell.",
      "knowledge":[{"area_id":"2.C.1.e","importance":4.6}]}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages careers with knowledge ratings'
);
select lives_ok(
  format($$ select * from ingest.merge_occupations(%s, '31.0') $$, (select run_id from t_run)),
  'the merge runs'
);
reset role;
select is(
  (select count(*)::int from public.occupation_knowledge where onet_code = '29-1141.00'),
  5,
  'knowledge ratings are stored; an unknown area is skipped'
);

set local role anon;
select results_eq(
  $$ select ap_name, area_name from public.ap_courses_for_career('29-1141.00') $$,
  $$ values
     ('AP Psychology', 'Psychology'),
     ('AP Biology', 'Medicine and Dentistry'),
     ('AP Chemistry', 'Medicine and Dentistry'),
     ('AP English Language and Composition', 'English Language'),
     ('AP English Literature and Composition', 'English Language') $$,
  'nursing: courses from areas rated 3.5 or more, most important first, each course once'
);
select is(
  (select count(*)::int from public.ap_courses_for_career('41-2031.00')),
  0,
  'a career whose important areas have no AP course gets none'
);
select is(
  (select count(*)::int from public.ap_courses_for_career('00-0000.00')),
  0,
  'an unknown career gets none'
);
select throws_ok(
  $$ insert into public.ap_courses (code, name, course_group) values ('x', 'AP X', 'Y') $$,
  '42501', null,
  'anon cannot change the AP list'
);
select is(
  (select count(*)::int from public.knowledge_ap_map),
  69,
  'anyone can read the map'
);
reset role;

select * from finish();
rollback;
