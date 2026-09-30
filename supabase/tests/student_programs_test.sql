-- Tests for student_programs: public read, the merge, and saving to the plan.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

grant usage on schema extensions to importer;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.student_programs'::regclass),
  'student_programs has Row Level Security enabled'
);

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('official_programs');
select ingest.stage_records((select run_id from t_run), '[
  {"kind":"student_program","source_record_id":"us-test-program","status":"valid","payload":{
    "id":"us-test-program","title":"Test Program","sponsor":"Agency","sponsor_type":"federal",
    "kind":"research","url":"https://example.gov/p","stages":["high_school"],"states":[],
    "remote":false,"paid":true,"pay_text":null,"deadline_kind":"rolling","deadline_date":null,
    "deadline_month_day":null,"who_text":null,"description":"A test.","checked_at":"2026-09-29"}}
]'::jsonb);
select lives_ok(
  format($$ select * from ingest.merge_student_programs(%s) $$, (select run_id from t_run)),
  'the importer merges programs (and a saved program leaving the list doesn''t block it)'
);
reset role;

set local role anon;
select is((select count(*)::int from public.student_programs), 1, 'anyone can read programs');
select throws_ok(
  $$ insert into public.student_programs (id, title, sponsor, sponsor_type, kind, url, stages, paid, deadline_kind, description, checked_at, retrieved_at)
     values ('us-x-y', 'x', 'x', 'federal', 'research', 'https://x.gov', '{college}', true, 'rolling', 'x', '2026-09-29', now()) $$,
  '42501', null,
  'visitors cannot add programs'
);
select throws_ok(
  $$ select * from ingest.merge_student_programs(1) $$,
  '42501', null,
  'visitors cannot run the merge'
);
reset role;

insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-5555-5555-5555-555555555555', 'student-e@example.test', '{"age_confirmed": true}');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.saved_items (student_program_id, title) values ('us-gone-program', 'Gone Program') $$,
  'a student saves a program (no foreign key, so it can outlive the listing)'
);
select throws_ok(
  $$ insert into public.saved_items (student_program_id, title) values ('us-gone-program', 'Gone Program') $$,
  '23505', null,
  'saving the same program twice is refused'
);
reset role;

select * from finish();
rollback;
