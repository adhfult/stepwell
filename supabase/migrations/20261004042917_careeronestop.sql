-- CareerOneStop Web API: youth programs, licenses by state, core
-- certifications. Spec: docs/specs/careeronestop.md. Public reference data,
-- written only by the importer through the merge functions below.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values
  ('cos_youth_programs', 'CareerOneStop: youth programs', 'api', 'https://www.careeronestop.org/', null,
   '2026-10-04', true, interval '1 month',
   'Source: CareerOneStop, sponsored by the U.S. Department of Labor, Employment and Training Administration (DOLETA), and the Minnesota Department of Employment and Economic Development (DEED).'),
  ('cos_licenses', 'CareerOneStop: licenses', 'api', 'https://www.careeronestop.org/', null,
   '2026-10-04', true, interval '3 months',
   'Source: CareerOneStop, sponsored by the U.S. Department of Labor, Employment and Training Administration (DOLETA), and the Minnesota Department of Employment and Economic Development (DEED).'),
  ('cos_certifications', 'CareerOneStop: certifications', 'api', 'https://www.careeronestop.org/', null,
   '2026-10-04', true, interval '3 months',
   'Source: CareerOneStop, sponsored by the U.S. Department of Labor, Employment and Training Administration (DOLETA), and the Minnesota Department of Employment and Economic Development (DEED).');

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution',
             'scholarship', 'opportunity', 'student_program', 'youth_program', 'career_license',
             'career_certification')
  );

create table public.youth_programs (
  id text primary key constraint youth_programs_id_valid check (id ~ '^\d{1,12}$'),
  name text not null constraint youth_programs_name_valid check (char_length(name) between 1 and 200),
  city text constraint youth_programs_city_valid check (char_length(city) <= 100),
  state text not null constraint youth_programs_state_valid check (state ~ '^[A-Z]{2}$'),
  zip text constraint youth_programs_zip_valid check (zip ~ '^\d{5}(-\d{4})?$'),
  website text constraint youth_programs_website_valid check (website ~ '^https://[^\s]+$'),
  source_id text not null default 'cos_youth_programs' references public.sources (id),
  retrieved_at timestamptz not null default now()
);

-- Occupations are retired, never deleted, so these keys are safe.
create table public.career_licenses (
  onet_code text not null references public.occupations (onet_code),
  license_id text not null constraint career_licenses_id_valid check (license_id ~ '^[A-Za-z0-9-]{1,40}$'),
  title text not null constraint career_licenses_title_valid check (char_length(title) between 1 and 200),
  state text not null constraint career_licenses_state_valid check (state ~ '^[A-Z]{2}$'),
  agency text constraint career_licenses_agency_valid check (char_length(agency) <= 300),
  agency_url text constraint career_licenses_agency_url_valid check (agency_url ~ '^https://[^\s]+$'),
  source_id text not null default 'cos_licenses' references public.sources (id),
  retrieved_at timestamptz not null default now(),
  primary key (onet_code, license_id)
);

create table public.career_certifications (
  onet_code text not null references public.occupations (onet_code),
  cert_id text not null constraint career_certifications_id_valid check (cert_id ~ '^[A-Za-z0-9-]{1,40}$'),
  name text not null constraint career_certifications_name_valid check (char_length(name) between 1 and 300),
  organization text constraint career_certifications_org_valid check (char_length(organization) <= 300),
  url text constraint career_certifications_url_valid check (url ~ '^https://[^\s]+$'),
  source_id text not null default 'cos_certifications' references public.sources (id),
  retrieved_at timestamptz not null default now(),
  primary key (onet_code, cert_id)
);

alter table public.youth_programs enable row level security;
alter table public.career_licenses enable row level security;
alter table public.career_certifications enable row level security;
create policy "Anyone can read youth programs" on public.youth_programs for select to anon, authenticated using (true);
create policy "Anyone can read career licenses" on public.career_licenses for select to anon, authenticated using (true);
create policy "Anyone can read career certifications" on public.career_certifications for select to anon, authenticated using (true);
revoke all on table public.youth_programs, public.career_licenses, public.career_certifications from anon, authenticated;
grant select on table public.youth_programs, public.career_licenses, public.career_certifications to anon, authenticated;

-- The careers to look up, for the licenses and certifications imports.
create function ingest.career_codes()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select onet_code from public.occupations where retired_at is null order by onet_code
$$;

-- Each merge replaces its table with the run's valid rows (the imports are
-- complete lists) and refuses an empty run. Counts: added, changed, removed.
create function ingest.merge_youth_programs(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql security definer set search_path = ''
as $$
declare v_added integer; v_changed integer; v_removed integer;
begin
  if not exists (select from ingest.import_runs r where r.id = p_run_id and r.status = 'running' and r.source_id = 'cos_youth_programs') then
    raise exception 'Run % is not a running youth programs run', p_run_id;
  end if;
  create temporary table pg_temp.incoming on commit drop as
  select x.* from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(id text, name text, city text, state text, zip text, website text)
  where s.run_id = p_run_id and s.kind = 'youth_program' and s.status = 'valid';
  if not exists (select from pg_temp.incoming) then raise exception 'Refusing to merge zero youth programs'; end if;

  select count(*) into v_added from pg_temp.incoming i where not exists (select from public.youth_programs t where t.id = i.id);
  select count(*) into v_changed from pg_temp.incoming i join public.youth_programs t on t.id = i.id
  where (t.name, t.city, t.state, t.zip, t.website) is distinct from (i.name, i.city, i.state, i.zip, i.website);
  delete from public.youth_programs t where not exists (select from pg_temp.incoming i where i.id = t.id);
  get diagnostics v_removed = row_count;
  insert into public.youth_programs (id, name, city, state, zip, website, retrieved_at)
  select id, name, city, state, zip, website, now() from pg_temp.incoming
  on conflict (id) do update set name = excluded.name, city = excluded.city, state = excluded.state,
    zip = excluded.zip, website = excluded.website, retrieved_at = excluded.retrieved_at;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

create function ingest.merge_career_licenses(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql security definer set search_path = ''
as $$
declare v_added integer; v_changed integer; v_removed integer;
begin
  if not exists (select from ingest.import_runs r where r.id = p_run_id and r.status = 'running' and r.source_id = 'cos_licenses') then
    raise exception 'Run % is not a running licenses run', p_run_id;
  end if;
  create temporary table pg_temp.incoming on commit drop as
  select x.* from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(onet_code text, license_id text, title text, state text, agency text, agency_url text)
  where s.run_id = p_run_id and s.kind = 'career_license' and s.status = 'valid'
    and exists (select from public.occupations o where o.onet_code = x.onet_code);
  if not exists (select from pg_temp.incoming) then raise exception 'Refusing to merge zero licenses'; end if;

  select count(*) into v_added from pg_temp.incoming i
  where not exists (select from public.career_licenses t where (t.onet_code, t.license_id) = (i.onet_code, i.license_id));
  select count(*) into v_changed from pg_temp.incoming i
  join public.career_licenses t on (t.onet_code, t.license_id) = (i.onet_code, i.license_id)
  where (t.title, t.state, t.agency, t.agency_url) is distinct from (i.title, i.state, i.agency, i.agency_url);
  delete from public.career_licenses t
  where not exists (select from pg_temp.incoming i where (i.onet_code, i.license_id) = (t.onet_code, t.license_id));
  get diagnostics v_removed = row_count;
  insert into public.career_licenses (onet_code, license_id, title, state, agency, agency_url, retrieved_at)
  select onet_code, license_id, title, state, agency, agency_url, now() from pg_temp.incoming
  on conflict (onet_code, license_id) do update set title = excluded.title, state = excluded.state,
    agency = excluded.agency, agency_url = excluded.agency_url, retrieved_at = excluded.retrieved_at;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

create function ingest.merge_career_certifications(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql security definer set search_path = ''
as $$
declare v_added integer; v_changed integer; v_removed integer;
begin
  if not exists (select from ingest.import_runs r where r.id = p_run_id and r.status = 'running' and r.source_id = 'cos_certifications') then
    raise exception 'Run % is not a running certifications run', p_run_id;
  end if;
  create temporary table pg_temp.incoming on commit drop as
  select x.* from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(onet_code text, cert_id text, name text, organization text, url text)
  where s.run_id = p_run_id and s.kind = 'career_certification' and s.status = 'valid'
    and exists (select from public.occupations o where o.onet_code = x.onet_code);
  if not exists (select from pg_temp.incoming) then raise exception 'Refusing to merge zero certifications'; end if;

  select count(*) into v_added from pg_temp.incoming i
  where not exists (select from public.career_certifications t where (t.onet_code, t.cert_id) = (i.onet_code, i.cert_id));
  select count(*) into v_changed from pg_temp.incoming i
  join public.career_certifications t on (t.onet_code, t.cert_id) = (i.onet_code, i.cert_id)
  where (t.name, t.organization, t.url) is distinct from (i.name, i.organization, i.url);
  delete from public.career_certifications t
  where not exists (select from pg_temp.incoming i where (i.onet_code, i.cert_id) = (t.onet_code, t.cert_id));
  get diagnostics v_removed = row_count;
  insert into public.career_certifications (onet_code, cert_id, name, organization, url, retrieved_at)
  select onet_code, cert_id, name, organization, url, now() from pg_temp.incoming
  on conflict (onet_code, cert_id) do update set name = excluded.name, organization = excluded.organization,
    url = excluded.url, retrieved_at = excluded.retrieved_at;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.career_codes(), ingest.merge_youth_programs(bigint),
  ingest.merge_career_licenses(bigint), ingest.merge_career_certifications(bigint)
  from public, anon, authenticated, service_role;
grant execute on function ingest.career_codes(), ingest.merge_youth_programs(bigint),
  ingest.merge_career_licenses(bigint), ingest.merge_career_certifications(bigint)
  to importer;
