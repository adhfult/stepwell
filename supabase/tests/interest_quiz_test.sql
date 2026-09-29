-- Tests for the interest quiz: questions, saved results, and matching.
-- Run with: npm run test:db. Rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- (pgTAP lives in the extensions schema; this grant is rolled back with the test.)
grant usage on schema extensions to importer;

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.interest_questions'::regclass, 'public.interest_results'::regclass)),
  'the new tables have Row Level Security enabled'
);

-- Questions: all 60 or nothing
delete from ingest.import_runs where source_id = 'onet_ip';
delete from public.interest_questions; -- start empty, whatever local imports loaded
set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('onet_ip');
select lives_ok(
  format($$ select ingest.stage_records(%s, (
    select jsonb_agg(jsonb_build_object(
      'kind', 'interest_question', 'source_record_id', n::text, 'status', 'valid',
      'payload', jsonb_build_object(
        'index', n,
        'area', (array['realistic','investigative','artistic','social','enterprising','conventional'])[((n - 1) / 2) %% 6 + 1],
        'text', 'Question ' || n)))
    from generate_series(1, 59) n)) $$, (select run_id from t_run)),
  'importer stages 59 questions'
);
select throws_ok(
  format($$ select * from ingest.merge_interest_questions(%s) $$, (select run_id from t_run)),
  'P0001', 'Expected 60 questions, got 59',
  'a partial question list is never merged'
);
select lives_ok(
  format($$ select ingest.stage_records(%s, '[{"kind":"interest_question","source_record_id":"60","status":"valid",
    "payload":{"index":60,"area":"conventional","text":"Question 60"}}]'::jsonb) $$, (select run_id from t_run)),
  'the 60th question is staged'
);
select results_eq(
  format($$ select added from ingest.merge_interest_questions(%s) $$, (select run_id from t_run)),
  $$ values (60 - (select 0)) $$,
  'all 60 questions are merged'
);
reset role;

set local role anon;
select is((select count(*)::int from public.interest_questions), 60, 'anyone can read the questions');
reset role;

-- Matching
delete from public.saved_items;
delete from public.occupations;
insert into public.occupations
  (onet_code, title, description, onet_release, retrieved_at, job_zone,
   interest_realistic, interest_investigative, interest_artistic, interest_social, interest_enterprising, interest_conventional)
values
  ('00-0001.00', 'Hands-on Career', 'R.', '31.0', now(), 2, 7, 3, 1, 2, 2, 3),
  ('00-0002.00', 'Helping Career',  'S.', '31.0', now(), 4, 1, 4, 3, 7, 3, 2),
  ('00-0003.00', 'Creative Career', 'A.', '31.0', now(), 4, 2, 3, 7, 4, 3, 1),
  ('00-0004.00', 'Unrated Career',  'X.', '31.0', now(), 3, null, null, null, null, null, null);
insert into public.occupations (onet_code, title, description, onet_release, retrieved_at, retired_at, job_zone,
   interest_realistic, interest_investigative, interest_artistic, interest_social, interest_enterprising, interest_conventional)
values ('00-0005.00', 'Retired Helping Career', 'S.', '30.0', now(), now(), 4, 1, 4, 3, 7, 3, 2);

set local role anon;
select is(
  (select array_agg(onet_code order by fit desc) from public.match_careers(2::smallint, 20::smallint, 12::smallint, 38::smallint, 14::smallint, 6::smallint)),
  array['00-0002.00', '00-0003.00', '00-0001.00'],
  'a Social-first student matches the helping career first; unrated and retired careers are left out'
);
select is(
  (select onet_code from public.match_careers(38::smallint, 12::smallint, 2::smallint, 6::smallint, 8::smallint, 14::smallint) limit 1),
  '00-0001.00',
  'a Realistic-first student matches the hands-on career first'
);
select is(
  (select array_agg(onet_code) from public.match_careers(2::smallint, 20::smallint, 12::smallint, 38::smallint, 14::smallint, 6::smallint, 2::smallint)),
  array['00-0001.00'],
  'the preparation filter keeps only that level'
);
select is(
  (select count(*)::int from public.match_careers(20::smallint, 20::smallint, 20::smallint, 20::smallint, 20::smallint, 20::smallint)),
  0,
  'equal scores in every area match nothing'
);
select throws_ok(
  $$ select * from public.match_careers(41::smallint, 0::smallint, 0::smallint, 0::smallint, 0::smallint, 0::smallint) $$,
  'P0001', 'Interest scores must be between 0 and 40',
  'scores over 40 are refused'
);
select throws_ok(
  $$ select * from public.match_careers(1::smallint, 2::smallint, 3::smallint, 4::smallint, 5::smallint, 6::smallint, 9::smallint) $$,
  'P0001', 'Preparation level must be between 1 and 5',
  'an unknown preparation level is refused'
);
reset role;

-- Saved results
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@example.test', '{"age_confirmed": true}'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@example.test', '{"age_confirmed": true}');
insert into public.interest_results (user_id, realistic, investigative, artistic, social, enterprising, conventional)
values ('22222222-2222-2222-2222-222222222222', 1, 2, 3, 4, 5, 6);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.interest_results (realistic, investigative, artistic, social, enterprising, conventional)
     values (27, 13, 23, 25, 14, 14)
     on conflict (user_id) do update set realistic = excluded.realistic, investigative = excluded.investigative,
       artistic = excluded.artistic, social = excluded.social, enterprising = excluded.enterprising,
       conventional = excluded.conventional, taken_at = now() $$,
  'a student saves their scores'
);
select lives_ok(
  $$ insert into public.interest_results (realistic, investigative, artistic, social, enterprising, conventional)
     values (30, 13, 23, 25, 14, 14)
     on conflict (user_id) do update set realistic = excluded.realistic, investigative = excluded.investigative,
       artistic = excluded.artistic, social = excluded.social, enterprising = excluded.enterprising,
       conventional = excluded.conventional, taken_at = now() $$,
  'saving again replaces them'
);
select is(
  (select string_agg(user_id::text || ' ' || realistic, ', ') from public.interest_results),
  '11111111-1111-1111-1111-111111111111 30',
  'a student sees only their own, latest scores'
);
select throws_ok(
  $$ insert into public.interest_results (user_id, realistic, investigative, artistic, social, enterprising, conventional)
     values ('22222222-2222-2222-2222-222222222222', 1, 1, 1, 1, 1, 1) $$,
  '42501', null,
  'a student cannot save scores for someone else'
);
select throws_ok(
  $$ update public.interest_results set realistic = 41 $$,
  '23514', null,
  'scores over 40 are refused'
);
delete from public.interest_results;
reset role;
select is(
  (select string_agg(user_id::text, ', ') from public.interest_results),
  '22222222-2222-2222-2222-222222222222',
  'a student removes their own results, never someone else''s'
);

set local role anon;
select throws_ok(
  $$ select * from public.interest_results $$,
  '42501', null,
  'anonymous visitors cannot read saved results'
);
reset role;

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.interest_results),
  0,
  'deleting an account deletes its results'
);

select * from finish();
rollback;
