-- Tests for the more-scholarships migration: the profile's county and
-- private programs in the scholarship list.
-- Run with: npm run test:db. Everything is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');

insert into public.scholarships (id, title, sponsor, sponsor_type, url, deadline_kind, stages, description, checked_at, retrieved_at)
  values ('pv-test-award', 'Test Award', 'Test Foundation', 'private', 'https://example.org/award', 'rolling',
          '{high_school}', 'A test.', '2026-10-06', now());

select ok(
  exists (select from public.match_scholarships('CA', 'high_school') where id = 'pv-test-award'),
  'a private program shows for students in any state'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ update public.profiles set county = '06037' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a student can save a county'
);
select throws_ok(
  $$ update public.profiles set county = 'LA' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null,
  'a county must be a 5-digit FIPS code'
);
update public.profiles set county = '06037' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select county from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'a student cannot set another student''s county'
);
set local role authenticated;
select is(
  (select count(*)::int from public.profiles where county is not null),
  1,
  'a student sees only their own county'
);

select * from finish();
rollback;
