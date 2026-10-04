-- Tests for the CareerOneStop tables: public read, importer-only merges.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

grant usage on schema extensions to importer;

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.youth_programs'::regclass, 'public.career_licenses'::regclass, 'public.career_certifications'::regclass)),
  'the three tables have Row Level Security enabled'
);

delete from public.youth_programs;

insert into public.occupations (onet_code, title, description, onet_release, retrieved_at)
  values ('99-9999.00', 'Test Career', 'A test.', '31.0', now())
  on conflict (onet_code) do nothing;

set local role importer;
select ok((select '99-9999.00' in (select ingest.career_codes())), 'the importer can list career codes');

create temporary table t_youth on commit drop as select * from ingest.start_run('cos_youth_programs');
select ingest.stage_records((select run_id from t_youth), '[
  {"kind":"youth_program","source_record_id":"1","status":"valid","payload":
    {"id":"1","name":"Test Youth Program","city":"Anchorage","state":"AK","zip":"99504","website":"https://example.org/"}}
]'::jsonb);
select results_eq(format($$ select * from ingest.merge_youth_programs(%s) $$, (select run_id from t_youth)),
  $$ values (1, 0, 0) $$, 'youth programs merge');

create temporary table t_lic on commit drop as select * from ingest.start_run('cos_licenses');
select ingest.stage_records((select run_id from t_lic), '[
  {"kind":"career_license","source_record_id":"a","status":"valid","payload":
    {"onet_code":"99-9999.00","license_id":"20-1","title":"Test License","state":"KS","agency":"Board","agency_url":null}},
  {"kind":"career_license","source_record_id":"b","status":"valid","payload":
    {"onet_code":"00-0000.00","license_id":"20-2","title":"Unknown career","state":"KS","agency":null,"agency_url":null}}
]'::jsonb);
select results_eq(format($$ select added from ingest.merge_career_licenses(%s) $$, (select run_id from t_lic)),
  $$ values (1) $$, 'licenses merge, skipping careers Stepwell does not have');

create temporary table t_cert on commit drop as select * from ingest.start_run('cos_certifications');
select ingest.stage_records((select run_id from t_cert), '[
  {"kind":"career_certification","source_record_id":"c","status":"valid","payload":
    {"onet_code":"99-9999.00","cert_id":"1-C","name":"Test Cert","organization":"Org","url":"https://example.org/c"}}
]'::jsonb);
select results_eq(format($$ select added from ingest.merge_career_certifications(%s) $$, (select run_id from t_cert)),
  $$ values (1) $$, 'certifications merge');
reset role;

set local role anon;
select is((select count(*)::int from public.career_licenses where onet_code = '99-9999.00'), 1, 'anyone can read licenses');
select throws_ok($$ insert into public.youth_programs (id, name, state) values ('2', 'x', 'AK') $$, '42501', null,
  'visitors cannot add youth programs');
select throws_ok($$ select ingest.career_codes() $$, '42501', null, 'visitors cannot list career codes');
reset role;

select * from finish();
rollback;
