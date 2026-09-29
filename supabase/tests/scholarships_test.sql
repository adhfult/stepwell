-- Tests for scholarships: the list merge, eligibility answers (owner-only,
-- retention) and match_scholarships(). Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

delete from public.scholarships;
delete from ingest.import_runs where source_id = 'official_list';

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.scholarships'::regclass, 'public.eligibility_profiles'::regclass)),
  'both tables have Row Level Security enabled'
);

-- The list
set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('official_list');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"scholarship","source_record_id":"us-pell","status":"valid","payload":{
      "id":"us-pell","title":"Federal Pell Grant","sponsor":"U.S. Department of Education","sponsor_type":"federal",
      "url":"https://studentaid.gov/understand-aid/types/grants/pell","award_max":7395,"award_text":"Up to $7,395",
      "deadline_kind":"unknown","stages":["high_school","college","adult"],"needs_fafsa":true,
      "description":"Money for college you don''t pay back.","checked_at":"2026-09-28"}},
    {"kind":"scholarship","source_record_id":"ca-cal-grant-a","status":"valid","payload":{
      "id":"ca-cal-grant-a","title":"Cal Grant A","sponsor":"California Student Aid Commission","sponsor_type":"state",
      "url":"https://www.csac.ca.gov/cal-grants","deadline_kind":"usually","deadline_month_day":"03-02",
      "stages":["high_school","college"],"state":"CA","min_gpa":3.0,"needs_fafsa":true,
      "description":"Tuition help for California students.","checked_at":"2026-09-28"}},
    {"kind":"scholarship","source_record_id":"ny-stem","status":"valid","payload":{
      "id":"ny-stem","title":"NYS STEM Incentive","sponsor":"HESC","sponsor_type":"state",
      "url":"https://www.hesc.ny.gov/stem","deadline_kind":"date","deadline_date":"2027-08-15",
      "stages":["high_school"],"state":"NY","fields":["11","14"],"citizenship":"citizen_or_eligible_noncitizen",
      "other_requirements":"Top 10%% of your high school class",
      "description":"Tuition for STEM majors at SUNY or CUNY.","checked_at":"2026-09-28"}},
    {"kind":"scholarship","source_record_id":"us-military","status":"valid","payload":{
      "id":"us-military","title":"Military Family Grant","sponsor":"U.S. Agency","sponsor_type":"federal",
      "url":"https://example.gov/grant","deadline_kind":"rolling","stages":["college"],"military_family":true,
      "description":"For military families.","checked_at":"2026-09-28"}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages the list'
);
select results_eq(
  format($$ select * from ingest.merge_scholarships(%s) $$, (select run_id from t_run)),
  $$ values (4, 0, 0) $$,
  'the merge adds all four'
);
reset role;

select throws_ok(
  $$ insert into public.scholarships (id, title, sponsor, sponsor_type, url, deadline_kind, stages, description, checked_at, retrieved_at)
     values ('us-bad', 'Bad', 'X', 'federal', 'https://x.gov', 'date', '{college}', 'x', '2026-09-28', now()) $$,
  '23514', null,
  'a date deadline needs a date'
);

-- Signed out: listings for a state, unrated, with what to check
set local role anon;
select is(
  (select array_agg(id order by id) from public.match_scholarships('CA')),
  array['ca-cal-grant-a', 'us-military', 'us-pell'],
  'a state shows its own and federal listings'
);
select is(
  (select array_agg(distinct match) from public.match_scholarships('CA')),
  array['open'],
  'without answers, nothing is rated'
);
select is(
  (select to_check from public.match_scholarships('CA') where id = 'ca-cal-grant-a'),
  array['A GPA of at least 3.0', 'Filing the FAFSA (or your state''s aid application)'],
  'each listing says what to check, in plain words'
);
select is(
  (select array_agg(id order by id) from public.match_scholarships(null, 'high_school')),
  array['ca-cal-grant-a', 'ny-stem', 'us-pell'],
  'the stage filter keeps listings open to high school students'
);
select throws_ok(
  $$ select * from public.match_scholarships('California') $$,
  'P0001', 'State must be a two-letter code',
  'a bad state is refused'
);
select throws_ok(
  $$ select * from public.eligibility_profiles $$,
  '42501', null,
  'anonymous visitors cannot read eligibility answers'
);
reset role;

-- Two students
insert into auth.users (id, email, raw_user_meta_data, last_sign_in_at) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}', now()),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}', now() - interval '13 months');
insert into public.eligibility_profiles (user_id, gpa, consent_version)
values ('22222222-2222-2222-2222-222222222222', 2.0, 1);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select array_agg(distinct match) from public.match_scholarships('CA')),
  array['open'],
  'a student who hasn''t opted in sees unrated listings'
);
select lives_ok(
  $$ insert into public.eligibility_profiles (gpa, intended_fields, citizenship, military_family, plans_fafsa, consent_version)
     values (3.4, '{11}', 'eligible_noncitizen', 'no', 'yes', 1) $$,
  'a student opts in with some answers'
);
select is(
  (select string_agg(user_id::text, ',') from public.eligibility_profiles),
  '11111111-1111-1111-1111-111111111111',
  'a student sees only their own answers'
);
select is(
  (select match from public.match_scholarships('CA') where id = 'ca-cal-grant-a'),
  'qualify',
  'GPA 3.4 and filing the FAFSA: qualifies for Cal Grant A'
);
select is(
  (select count(*)::int from public.match_scholarships() where id = 'us-military'),
  0,
  'not a military family: that listing is hidden'
);
select is(
  (select match || ': ' || array_to_string(to_check, '; ') from public.match_scholarships('NY') where id = 'ny-stem'),
  'might: Top 10% of your high school class',
  'computing student, eligible noncitizen: might qualify, with the one thing to check'
);
select is(
  (select array_agg(id order by id) from public.match_scholarships('CA')),
  array['ca-cal-grant-a', 'us-pell'],
  'qualifying listings come back; failing ones are hidden'
);
select lives_ok(
  $$ update public.eligibility_profiles set gpa = 2.5 $$,
  'a student changes an answer'
);
select is(
  (select count(*)::int from public.match_scholarships('CA') where id = 'ca-cal-grant-a'),
  0,
  'a GPA under the minimum hides the listing'
);
select throws_ok(
  $$ insert into public.eligibility_profiles (user_id, consent_version)
     values ('22222222-2222-2222-2222-222222222222', 1) $$,
  '42501', null,
  'a student cannot write answers for someone else'
);
select throws_ok(
  $$ update public.eligibility_profiles set gpa = 7 $$,
  '23514', null,
  'a GPA over 5 is refused'
);
reset role;

-- Retention and account deletion
select is(ingest.purge_stale_eligibility(), 1, 'answers of a student with no sign-in for 13 months are deleted');
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.eligibility_profiles), 0, 'deleting an account deletes its answers');
select is(
  (select schedule from cron.job where jobname = 'purge-stale-eligibility'),
  '41 4 * * *',
  'the retention clean-up is scheduled daily'
);

select * from finish();
rollback;
