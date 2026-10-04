-- Tests for the college directory: new Scorecard columns, their checks, and
-- search_colleges() filters, sorting and paging. Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

grant usage on schema extensions to importer;

delete from public.saved_items;
delete from public.institutions;
delete from ingest.import_runs where source_id = 'scorecard';

-- The merge stores the new fields
set local role importer;
create temporary table t_sc on commit drop as select * from ingest.start_run('scorecard');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"institution","source_record_id":"1","status":"valid","payload":{
      "unitid":1,"name":"Coastal College","city":"Portland","state":"OR","ownership":"public",
      "net_price":9000,"admission_rate":0.6,"graduation_rate":0.61,"students":5000,
      "sat_read_25":500,"sat_read_75":600,"sat_math_25":510,"sat_math_75":620,"act_25":20,"act_75":27,
      "test_policy":"considered","net_price_by_income":[4000,6000,9000,14000,null],"locale":"city",
      "two_year":false,"serves":["hsi"],
      "programs":[{"cip4":"51.38","credential_level":3,"title":"Registered Nursing.","credential_title":"Bachelor''s Degree","graduates":80}]}},
    {"kind":"institution","source_record_id":"2","status":"valid","payload":{
      "unitid":2,"name":"Mountain 100%% University","city":"Denver","state":"CO","ownership":"private_nonprofit",
      "net_price":30000,"admission_rate":0.2,"students":20000,"test_policy":"required","locale":"suburb",
      "two_year":false,"programs":[]}}
  ]'::jsonb) $$, (select run_id from t_sc)),
  'importer stages colleges with the new fields'
);
select results_eq(
  format($$ select * from ingest.merge_institutions(%s) $$, (select run_id from t_sc)),
  $$ values (2, 0, 0) $$,
  'the merge adds both colleges'
);
reset role;
select is(
  (select row(sat_read_25, sat_math_75, act_75, test_policy, net_price_by_income, locale, two_year, serves)::text
   from public.institutions where unitid = 1),
  row(500, 620, 27, 'considered', array[4000, 6000, 9000, 14000, null], 'city', false, array['hsi'])::text,
  'the new fields are stored'
);

-- Checks
select throws_ok($$ update public.institutions set sat_math_25 = 900 where unitid = 1 $$, '23514', null, 'SAT above 800 is refused');
select throws_ok($$ update public.institutions set act_75 = 40 where unitid = 1 $$, '23514', null, 'ACT above 36 is refused');
select throws_ok($$ update public.institutions set test_policy = 'maybe' where unitid = 1 $$, '23514', null, 'an unknown policy is refused');
select throws_ok($$ update public.institutions set net_price_by_income = array[1, 2] where unitid = 1 $$, '23514', null, 'income prices need five brackets');
select throws_ok($$ update public.institutions set serves = array['other'] where unitid = 1 $$, '23514', null, 'an unknown flag is refused');

-- 30 small two-year colleges in Texas, for paging
insert into public.institutions (unitid, name, state, ownership, students, net_price, two_year, retrieved_at)
select 100 + g, 'Texas College ' || lpad(g::text, 2, '0'), 'TX', 'public', 100 + g, 1000 + g, true, now()
from generate_series(1, 30) g;

set local role anon;
select is((select array_agg(name) from public.search_colleges(p_name => 'coast')), array['Coastal College'], 'name search');
select is((select array_agg(name) from public.search_colleges(p_name => '100%')), array['Mountain 100% University'], 'a % in the name search is matched literally');
select is((select count(*)::int from public.search_colleges(p_name => '_')), 0, 'a lone _ matches nothing');
select is((select array_agg(name) from public.search_colleges(p_program => 'nursing')), array['Coastal College'], 'has a program in');
select is((select array_agg(name) from public.search_colleges(p_state => 'CO')), array['Mountain 100% University'], 'state');
select is((select array_agg(name) from public.search_colleges(p_size => 'large')), array['Mountain 100% University'], 'size');
select is((select array_agg(name) from public.search_colleges(p_admit => 'under25')), array['Mountain 100% University'], 'admission rate');
select is((select array_agg(name) from public.search_colleges(p_test_optional => true, p_two_year => false)), array['Coastal College'], 'test-optional and four-year combine');
select is((select array_agg(name) from public.search_colleges(p_locale => 'suburb')), array['Mountain 100% University'], 'setting');
select is((select array_agg(name) from public.search_colleges(p_serves => 'hsi')), array['Coastal College'], 'minority-serving');
select is(
  (select array_agg(name || ' ' || price) from public.search_colleges(p_bracket => 2, p_max_price => 7000, p_two_year => false)),
  array['Coastal College 6000'],
  'most I''d pay uses the chosen bracket'
);
select is(
  (select array_agg(name) from public.search_colleges(p_max_price => 10000, p_two_year => false)),
  array['Coastal College'],
  'with no bracket, most I''d pay uses the average net price'
);
select is(
  (select array_agg(name) from public.search_colleges(p_sort => 'size', p_two_year => false)),
  array['Mountain 100% University', 'Coastal College'],
  'sort by size, largest first'
);
select is(
  (select array[count(*), max(total)]::int[] from public.search_colleges(p_state => 'TX', p_page => 2)),
  array[6, 30],
  'page 2 holds the last 6 of 30'
);
select is(
  (select array_agg(name) from public.search_colleges(p_state => 'TX', p_page => 99)),
  (select array_agg(name) from public.search_colleges(p_state => 'TX', p_page => 2)),
  'a page past the end shows the last page'
);
select throws_ok(
  $$ select * from public.search_colleges(p_sort => 'rank') $$,
  'P0001', 'Unknown sort',
  'a bad argument is refused'
);
reset role;

select * from finish();
rollback;
