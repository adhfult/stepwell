-- Tests for the per-student row caps on saved_items and plan_items.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'student-c@example.test', '{"age_confirmed": true}');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.plan_items (title) select 'Step ' || n from generate_series(1, 500) n $$,
  'a student can have 500 plan steps'
);
select throws_ok(
  $$ insert into public.plan_items (title) values ('One too many') $$,
  '54000', null,
  'the 501st plan step is refused'
);
select lives_ok(
  $$ insert into public.saved_items (unitid, title) select n, 'College ' || n from generate_series(1, 1000) n $$,
  'a student can save 1,000 items'
);
select throws_ok(
  $$ insert into public.saved_items (unitid, title) values (1001, 'One too many') $$,
  '54000', null,
  'the 1,001st saved item is refused'
);

select * from finish();
rollback;
