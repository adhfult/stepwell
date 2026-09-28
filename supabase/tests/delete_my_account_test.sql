-- Tests for public.delete_my_account() (decision 0004).
-- Run with: npm run test:db (needs the local Supabase: npm run db:start).

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');

-- How the function is defined
select ok(
  (select prosecdef from pg_proc where oid = 'public.delete_my_account()'::regprocedure),
  'runs as security definer (students can''t delete from auth.users themselves)'
);
select ok(
  (select 'search_path=""' = any(proconfig) from pg_proc where oid = 'public.delete_my_account()'::regprocedure),
  'pins an empty search_path'
);
select ok(
  not has_function_privilege('anon', 'public.delete_my_account()', 'execute'),
  'anonymous visitors cannot run it'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_my_account()', 'execute'),
  'signed-in students can run it'
);

-- Anonymous visitor
set local role anon;
select throws_ok(
  'select public.delete_my_account()',
  '42501', null,
  'an anonymous call is refused'
);
reset role;

-- The authenticated role without a user id (no sub claim)
set local role authenticated;
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select throws_ok(
  'select public.delete_my_account()',
  '42501', 'Not signed in',
  'a call without a signed-in user is refused'
);

-- Signed in as student A
select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
select lives_ok('select public.delete_my_account()', 'student A can delete their account');
reset role;

select is(
  (select count(*)::int from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'student A''s login is gone'
);
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'student A''s profile is gone (cascade)'
);
select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  1,
  'student B is untouched'
);

select * from finish();
rollback;
