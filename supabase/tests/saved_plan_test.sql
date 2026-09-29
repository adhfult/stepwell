-- Tests for the saved plan: saved scholarships and colleges, plan items (owner-only),
-- and that the scholarship merge still runs when a saved program leaves the list.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

grant usage on schema extensions to importer;

delete from public.saved_items;
delete from public.plan_items;

select ok(
  (select relrowsecurity from pg_class where oid = 'public.plan_items'::regclass),
  'plan_items has Row Level Security enabled'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');
insert into public.plan_items (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'B''s task');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.saved_items (scholarship_id, title) values ('zz-gone-grant', 'Gone Grant') $$,
  'a student saves a scholarship'
);
select lives_ok(
  $$ insert into public.saved_items (unitid, title) values (123456, 'Example College') $$,
  'a student saves a college'
);
select throws_ok(
  $$ insert into public.saved_items (scholarship_id, title) values ('zz-gone-grant', 'Gone Grant') $$,
  '23505', null,
  'saving the same scholarship twice is refused'
);
select throws_ok(
  $$ insert into public.saved_items (scholarship_id, unitid) values ('zz-gone-grant', 1) $$,
  '23514', null,
  'a saved item links to exactly one thing'
);

select lives_ok(
  $$ insert into public.plan_items (title, kind, academic_year, term) values ('Take AP Biology', 'class', 2027, 'full_year') $$,
  'a student adds a plan item'
);
select is(
  (select count(*)::int from public.plan_items),
  1,
  'a student sees only their own plan items'
);
select throws_ok(
  $$ insert into public.plan_items (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'Sneaky') $$,
  '42501', null,
  'a student cannot add to someone else''s plan'
);
select throws_ok(
  $$ insert into public.plan_items (title) values ('   ') $$,
  '23514', null,
  'a blank title is refused'
);
select lives_ok(
  $$ update public.plan_items set done = true, academic_year = 2028, term = 'fall' $$,
  'a student moves and finishes their item'
);
select throws_ok(
  $$ update public.plan_items set user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null,
  'an item cannot be handed to someone else'
);
update public.plan_items set title = 'Changed' where user_id = '22222222-2222-2222-2222-222222222222';
delete from public.plan_items where user_id = '22222222-2222-2222-2222-222222222222';
reset role;
select is(
  (select title from public.plan_items where user_id = '22222222-2222-2222-2222-222222222222'),
  'B''s task',
  'another student''s item cannot be changed or removed'
);

-- The merge deletes a saved scholarship's listing without failing.
insert into public.scholarships (id, title, sponsor, sponsor_type, url, deadline_kind, stages, description, checked_at, source_id, retrieved_at)
  values ('zz-gone-grant', 'Gone Grant', 'Agency', 'federal', 'https://example.gov/gone', 'rolling', '{college}', 'Gone.', '2026-09-28', 'official_list', now())
  on conflict (id) do nothing;
set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('official_list');
select ingest.stage_records((select run_id from t_run), '[
  {"kind":"scholarship","source_record_id":"us-stays","status":"valid","payload":{
    "id":"us-stays","title":"Stays Grant","sponsor":"Agency","sponsor_type":"federal",
    "url":"https://example.gov/stays","deadline_kind":"rolling","stages":["college"],
    "description":"Stays.","checked_at":"2026-09-28"}}
]'::jsonb);
select lives_ok(
  format($$ select * from ingest.merge_scholarships(%s) $$, (select run_id from t_run)),
  'the merge removes a saved scholarship''s listing'
);
reset role;
select is(
  (select title from public.saved_items where scholarship_id = 'zz-gone-grant'),
  'Gone Grant',
  'the save stays, with its title, for "No longer listed"'
);

select * from finish();
rollback;
