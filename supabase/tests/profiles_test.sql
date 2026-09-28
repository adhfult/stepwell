-- Tests for public.profiles: the 13+ sign-up gate, Row Level Security,
-- column privileges and value checks.
-- Run with: npm run test:db (needs the local Supabase: npm run db:start).
-- Everything runs in one transaction and is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Two students, inserted the way Supabase Auth inserts them.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');

-- Sign-up and the table itself
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has Row Level Security enabled'
);
select is(
  (select count(*)::int from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'signing up creates a profile row'
);
select ok(
  (select age_confirmed from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'the profile records the age confirmation'
);
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('33333333-3333-3333-3333-333333333333', 'no-flag@example.test', '{}') $$,
  'P0001', 'Sign-up requires age confirmation',
  'sign-up without age confirmation is refused'
);
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('44444444-4444-4444-4444-444444444444', 'false-flag@example.test', '{"age_confirmed": false}') $$,
  'P0001', 'Sign-up requires age confirmation',
  'sign-up with age_confirmed false is refused'
);
select ok(
  has_table_privilege('postgres', 'auth.users', 'DELETE'),
  'postgres may delete from auth.users (decision 0004 depends on this)'
);

update public.profiles set updated_at = '2000-01-01'
where id = '11111111-1111-1111-1111-111111111111';
select ok(
  (select updated_at > '2000-01-01' from public.profiles
   where id = '11111111-1111-1111-1111-111111111111'),
  'updated_at is set by the trigger on every update'
);

-- Anonymous visitors
set local role anon;
select throws_ok(
  'select * from public.profiles',
  '42501', null,
  'anonymous visitors cannot read profiles'
);
reset role;

-- Signed in as student A
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);

select results_eq(
  'select id from public.profiles',
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'a student sees only their own profile'
);
select lives_ok(
  $$ update public.profiles
     set nickname = 'Sam', stage = 'high_school', state = 'OH', grad_year = 2029
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'a student can fill in their own profile'
);
select lives_ok(
  $$ update public.profiles set nickname = 'Changed by A'
     where id = '22222222-2222-2222-2222-222222222222' $$,
  'updating another student''s row raises no error (RLS hides the row; checked below)'
);
select throws_ok(
  $$ update public.profiles set age_confirmed = false
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'age_confirmed cannot be changed by the student'
);
select throws_ok(
  $$ update public.profiles set id = '22222222-2222-2222-2222-222222222222'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'id cannot be changed by the student'
);
select throws_ok(
  $$ update public.profiles set created_at = now()
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'created_at cannot be changed by the student'
);
select throws_ok(
  $$ insert into public.profiles (id, age_confirmed)
     values ('11111111-1111-1111-1111-111111111111', true) $$,
  '42501', null,
  'students cannot insert profile rows'
);
select throws_ok(
  $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'students cannot delete profile rows'
);

-- Value checks (the same rules the forms check with zod)
select throws_ok(
  $$ update public.profiles set stage = 'admin'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'an unknown stage is rejected'
);
select throws_ok(
  $$ update public.profiles set state = 'ZZ'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'an unknown state code is rejected'
);
select throws_ok(
  $$ update public.profiles set nickname = repeat('x', 41)
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'a nickname over 40 characters is rejected'
);
select throws_ok(
  $$ update public.profiles set nickname = E'Sam\nBob'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'a nickname with control characters is rejected'
);
select throws_ok(
  $$ update public.profiles set nickname = ' Sam'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'an untrimmed nickname is rejected'
);
select throws_ok(
  $$ update public.profiles set grad_year = 2100
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'a graduation year outside 1950 to 2040 is rejected'
);
select throws_ok(
  $$ update public.profiles set stage = 'adult_learner'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'an adult learner cannot keep a graduation year'
);
reset role;

-- Back to the database owner to check what happened
select is(
  (select nickname from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'student B''s profile was not changed by student A'
);

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'deleting the account deletes the profile'
);

select * from finish();
rollback;
