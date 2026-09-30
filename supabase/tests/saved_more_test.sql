-- Saving internships and AP classes, and that the internships merge still runs
-- when a saved posting leaves USAJOBS. Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

grant usage on schema extensions to importer;

insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-4444-4444-4444-444444444444', 'student-d@example.test', '{"age_confirmed": true}');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.saved_items (opportunity_id, title) values ('999999001', 'Gone Internship') $$,
  'a student saves an internship'
);
select lives_ok(
  format($$ insert into public.saved_items (ap_course_code) values (%L) $$, (select code from public.ap_courses order by code limit 1)),
  'a student saves an AP class'
);
select throws_ok(
  $$ insert into public.saved_items (ap_course_code) values ('not-a-course') $$,
  '23503', null,
  'an AP class must exist'
);
reset role;

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('usajobs');
select ingest.stage_records((select run_id from t_run), '[
  {"kind":"opportunity","source_record_id":"812345600","status":"valid","payload":{
    "id":"812345600","title":"Student Trainee (Biology)","organization":"U.S. Fish and Wildlife Service",
    "places":["Denver, Colorado"],"states":["CO"],"remote":false,"pay_min":18.5,"pay_max":24,
    "pay_interval":"hour","who_may_apply":"Students","closes_on":"2099-10-20",
    "summary":null,"url":"https://www.usajobs.gov/job/812345600"}}
]'::jsonb);
select lives_ok(
  format($$ select * from ingest.merge_opportunities(%s) $$, (select run_id from t_run)),
  'the merge runs while a saved posting is gone'
);
reset role;
select is(
  (select title from public.saved_items where opportunity_id = '999999001'),
  'Gone Internship',
  'the saved internship stays, with its title'
);

select * from finish();
rollback;
