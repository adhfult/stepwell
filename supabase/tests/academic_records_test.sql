-- Tests for academic_records: owner-only access, the checks the form's zod
-- schema repeats, and retention. Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.academic_records'::regclass),
  'academic_records has Row Level Security enabled'
);

insert into auth.users (id, email, raw_user_meta_data, last_sign_in_at) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}', now()),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}', now() - interval '13 months');
insert into public.academic_records (user_id, sat, consent_version)
values ('22222222-2222-2222-2222-222222222222', 1200, 1);

set local role anon;
select throws_ok($$ select * from public.academic_records $$, '42501', null, 'anonymous visitors cannot read grades');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.academic_records (courses, weight_ap, start_unweighted, start_credits, sat, act, consent_version)
     values ('[{"name":"AP Biology","type":"ap","grade":"B+","credits":1},
               {"name":"English 11","type":"regular","grade":null,"credits":0.5}]', 0.5, 3.4, 12, 1300, 28, 1) $$,
  'a student saves classes, a weight, the shortcut and scores'
);
select is(
  (select string_agg(user_id::text, ',') from public.academic_records),
  '11111111-1111-1111-1111-111111111111',
  'a student sees only their own row'
);
select lives_ok($$ update public.academic_records set sat = 1350, act = null $$, 'a student changes their scores');
select throws_ok(
  $$ insert into public.academic_records (user_id, consent_version) values ('22222222-2222-2222-2222-222222222222', 1) $$,
  '42501', null,
  'a student cannot write a row for someone else'
);
select throws_ok(
  $$ update public.academic_records set courses = (select jsonb_agg(jsonb_build_object(
       'name', 'Class ' || n, 'type', 'regular', 'grade', 'A', 'credits', 1)) from generate_series(1, 81) n) $$,
  '23514', null,
  'an 81st class is refused'
);
select throws_ok(
  $$ update public.academic_records set courses = '[{"name":"x","type":"regular","grade":"Z","credits":1}]' $$,
  '23514', null,
  'an unknown grade is refused'
);
select throws_ok(
  $$ update public.academic_records set courses = '[{"name":"x","type":"regular","grade":"A","credits":0.3}]' $$,
  '23514', null,
  'credits off the half-step are refused'
);
select throws_ok(
  $$ update public.academic_records set courses = '[{"name":"x","type":"regular","grade":"A","credits":1,"extra":1}]' $$,
  '23514', null,
  'a class with extra fields is refused'
);
select throws_ok($$ update public.academic_records set sat = 1605 $$, '23514', null, 'an SAT of 1605 is refused');
select throws_ok($$ update public.academic_records set act = 37 $$, '23514', null, 'an ACT of 37 is refused');
reset role;

select is(ingest.purge_stale_academic_records(), 1, 'a row with no sign-in for 13 months is deleted');
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.academic_records), 0, 'deleting an account deletes its row');

select * from finish();
rollback;
