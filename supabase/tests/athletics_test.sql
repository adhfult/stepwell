-- Tests for the college athlete path (spec ncaa-athlete-path.md): the EADA
-- merge, public read-only college_sports, class tags, and sport filters.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

grant usage on schema extensions to importer;

delete from public.saved_items;
delete from public.institutions;
delete from ingest.import_runs where source_id = 'eada';
insert into public.institutions (unitid, name, retrieved_at) values
  (1, 'Coastal College', now()), (2, 'Mountain University', now()), (3, 'Valley Junior College', now());

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('eada');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"college_athletics","source_record_id":"1","status":"valid","payload":
      {"unitid":1,"code":4,"sports":[{"sport":"soccer","men":null,"women":28},{"sport":"track","men":40,"women":38}]}},
    {"kind":"college_athletics","source_record_id":"2","status":"valid","payload":
      {"unitid":2,"code":1,"sports":[{"sport":"soccer","men":30,"women":null}]}},
    {"kind":"college_athletics","source_record_id":"99","status":"valid","payload":
      {"unitid":99,"code":12,"sports":[{"sport":"golf","men":8,"women":null}]}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages EADA colleges'
);
select results_eq(
  format($$ select * from ingest.merge_college_athletics(%s) $$, (select run_id from t_run)),
  $$ values (3, 0, 0) $$,
  'the merge adds three teams and skips a college not in Scorecard'
);
reset role;
select is((select athletics_code from public.institutions where unitid = 1), 4::smallint, 'the athletics level is stored');
select is((select athletics_code from public.institutions where unitid = 3), null::smallint, 'a college not in EADA has no level');
select is((select women from public.college_sports where unitid = 1 and sport = 'soccer'), 28::smallint, 'roster sizes are stored');

set local role anon;
select is((select count(*)::int from public.college_sports), 3, 'anyone can read college sports');
select throws_ok($$ insert into public.college_sports (unitid, sport, men) values (3, 'golf', 5) $$, '42501', null,
  'anon cannot write college sports');
select is((select count(*)::int from public.search_colleges(p_sport => 'soccer')), 2, 'sport filter');
select is((select name from public.search_colleges(p_sport => 'soccer', p_team => 'women')), 'Coastal College',
  'team filter');
select is((select name from public.search_colleges(p_level => 'd1')), 'Mountain University', 'level filter');
select throws_ok($$ select * from public.search_colleges(p_level => 'd4') $$, 'P0001', null, 'unknown level refused');
reset role;

select ok(public.academic_courses_valid(
  '[{"name":"English 9","type":"regular","grade":"A","credits":1,"core":"english","year":9}]'), 'tags are accepted');
select ok(not public.academic_courses_valid(
  '[{"name":"Gym","type":"regular","grade":"A","credits":1,"core":"gym"}]'), 'an unknown core area is refused');
select ok(not public.academic_courses_valid(
  '[{"name":"Math","type":"regular","grade":"A","credits":1,"year":8}]'), 'a year outside 9 to 12 is refused');

select * from finish();
rollback;
