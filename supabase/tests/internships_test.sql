-- Tests for internships: the USAJOBS merge and public read access.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

delete from public.opportunities;
delete from ingest.import_runs where source_id = 'usajobs';

select ok(
  (select relrowsecurity from pg_class where oid = 'public.opportunities'::regclass),
  'opportunities has Row Level Security enabled'
);

-- First run: two postings
set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('usajobs');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"opportunity","source_record_id":"812345600","status":"valid","payload":{
      "id":"812345600","title":"Student Trainee (Biology)","organization":"U.S. Fish and Wildlife Service",
      "places":["Denver, Colorado"],"states":["CO"],"remote":false,"pay_min":18.5,"pay_max":24,
      "pay_interval":"hour","who_may_apply":"United States Citizens","closes_on":"2026-10-20",
      "summary":"Students in a biology program.","url":"https://www.usajobs.gov/job/812345600"}},
    {"kind":"opportunity","source_record_id":"812345601","status":"valid","payload":{
      "id":"812345601","title":"Pathways Intern (IT)","organization":"Internal Revenue Service",
      "places":["Anywhere in the U.S. (remote job)"],"states":[],"remote":true,"pay_min":41966,"pay_max":54557,
      "pay_interval":"year","who_may_apply":"Students","closes_on":"2026-10-05",
      "summary":null,"url":"https://www.usajobs.gov/job/812345601"}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages postings'
);
select results_eq(
  format($$ select * from ingest.merge_opportunities(%s) $$, (select run_id from t_run)),
  $$ values (2, 0, 0) $$,
  'the first merge adds both'
);
select lives_ok(
  format($$ select ingest.finish_run(%s, 'succeeded', 2, 0, 2, 0, 0) $$, (select run_id from t_run)),
  'the first run finishes'
);

-- Second run: one posting changed its closing date, the other left USAJOBS
create temporary table t_run2 on commit drop as select * from ingest.start_run('usajobs');
select ingest.stage_records((select run_id from t_run2), '[
  {"kind":"opportunity","source_record_id":"812345600","status":"valid","payload":{
    "id":"812345600","title":"Student Trainee (Biology)","organization":"U.S. Fish and Wildlife Service",
    "places":["Denver, Colorado"],"states":["CO"],"remote":false,"pay_min":18.5,"pay_max":24,
    "pay_interval":"hour","who_may_apply":"United States Citizens","closes_on":"2026-10-27",
    "summary":"Students in a biology program.","url":"https://www.usajobs.gov/job/812345600"}}
]'::jsonb);
select results_eq(
  format($$ select * from ingest.merge_opportunities(%s) $$, (select run_id from t_run2)),
  $$ values (0, 1, 1) $$,
  'the second merge changes one and removes the posting that left'
);
reset role;

-- Anyone can read; nobody writes through the Data API
set local role anon;
select is(
  (select closes_on from public.opportunities where id = '812345600'),
  '2026-10-27'::date,
  'visitors read postings, with the new date'
);
select throws_ok(
  $$ insert into public.opportunities (id, title, organization, closes_on, url, retrieved_at)
     values ('1', 'x', 'x', '2026-10-01', 'https://www.usajobs.gov/job/1', now()) $$,
  '42501', null,
  'visitors cannot add postings'
);
reset role;

select throws_ok(
  $$ insert into public.opportunities (id, title, organization, closes_on, url, retrieved_at)
     values ('2', 'x', 'x', '2026-10-01', 'https://evil.example/usajobs.gov/', now()) $$,
  '23514', null,
  'links must go to usajobs.gov'
);
select throws_ok(
  $$ select ingest.merge_opportunities(-1) $$,
  'P0001', null,
  'the merge refuses a run that is not a running USAJOBS run'
);

select * from finish();
rollback;
