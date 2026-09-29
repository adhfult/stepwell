-- Internships: open federal postings for students from the USAJOBS Search
-- API (HiringPath=student), refreshed daily. Spec: docs/specs/internships.md.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'usajobs',
  'USAJOBS Search API (student hiring path)',
  'api',
  'https://developer.usajobs.gov/',
  'https://developer.usajobs.gov/guides/terms-of-use',
  '2026-09-29',
  true,
  interval '1 day',
  'Source: USAJOBS, U.S. Office of Personnel Management.'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in (
      'occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution',
      'scholarship', 'opportunity'
    )
  );

-- Postings -----------------------------------------------------------------------
-- Public facts from a public job board, so anyone may read them. Closed
-- postings stay until the next import removes them; pages hide them by date.

create table public.opportunities (
  -- The USAJOBS control number (the number in the posting's URL).
  id text primary key constraint opportunities_id_valid check (id ~ '^\d{1,20}$'),
  title text not null constraint opportunities_title_valid check (char_length(title) between 1 and 300),
  organization text not null
    constraint opportunities_organization_valid check (char_length(organization) between 1 and 200),
  -- Place names as USAJOBS shows them, and the states among them (for the filter).
  places text[] not null default '{}' constraint opportunities_places_valid check (cardinality(places) <= 500),
  states text[] not null default '{}'
    constraint opportunities_states_valid check (array_to_string(states, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$'),
  remote boolean not null default false,
  pay_min numeric(10, 2) constraint opportunities_pay_min_valid check (pay_min > 0),
  pay_max numeric(10, 2) constraint opportunities_pay_max_valid check (pay_max > 0),
  pay_interval text
    constraint opportunities_pay_interval_valid check (pay_interval in ('year', 'month', 'biweekly', 'week', 'day', 'hour')),
  who_may_apply text constraint opportunities_who_valid check (char_length(who_may_apply) <= 200),
  closes_on date not null,
  summary text constraint opportunities_summary_valid check (char_length(summary) <= 500),
  url text not null constraint opportunities_url_valid check (url ~ '^https://(www\.)?usajobs\.gov/[^\s]*$'),
  source_id text not null default 'usajobs' references public.sources (id),
  retrieved_at timestamptz not null
);

alter table public.opportunities enable row level security;
create policy "Anyone can read opportunities" on public.opportunities for select to anon, authenticated using (true);
revoke all on table public.opportunities from anon, authenticated;
grant select on table public.opportunities to anon, authenticated;

-- Replaces every posting in one transaction: postings that left USAJOBS go.
create function ingest.merge_opportunities(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
  v_changed integer;
  v_removed integer;
begin
  if not exists (
    select from ingest.import_runs r
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'usajobs'
  ) then
    raise exception 'Run % is not a running USAJOBS run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(
         id text, title text, organization text, places text[], states text[], remote boolean,
         pay_min numeric, pay_max numeric, pay_interval text, who_may_apply text,
         closes_on date, summary text, url text
       )
  where s.run_id = p_run_id and s.kind = 'opportunity' and s.status = 'valid';

  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero opportunities';
  end if;

  select count(*) into v_added
  from pg_temp.incoming i where not exists (select from public.opportunities o where o.id = i.id);
  select count(*) into v_changed
  from pg_temp.incoming i join public.opportunities o on o.id = i.id
  where (o.title, o.places, o.pay_min, o.pay_max, o.who_may_apply, o.closes_on, o.summary, o.url)
        is distinct from (i.title, i.places, i.pay_min, i.pay_max, i.who_may_apply, i.closes_on, i.summary, i.url);

  delete from public.opportunities o where not exists (select from pg_temp.incoming i where i.id = o.id);
  get diagnostics v_removed = row_count;

  insert into public.opportunities (
    id, title, organization, places, states, remote, pay_min, pay_max, pay_interval,
    who_may_apply, closes_on, summary, url, source_id, retrieved_at
  )
  select
    i.id, i.title, i.organization, coalesce(i.places, '{}'), coalesce(i.states, '{}'),
    coalesce(i.remote, false), i.pay_min, i.pay_max, i.pay_interval, i.who_may_apply,
    i.closes_on, i.summary, i.url, 'usajobs', now()
  from pg_temp.incoming i
  on conflict (id) do update
  set title = excluded.title, organization = excluded.organization, places = excluded.places,
      states = excluded.states, remote = excluded.remote, pay_min = excluded.pay_min,
      pay_max = excluded.pay_max, pay_interval = excluded.pay_interval,
      who_may_apply = excluded.who_may_apply, closes_on = excluded.closes_on,
      summary = excluded.summary, url = excluded.url, retrieved_at = excluded.retrieved_at;

  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_opportunities(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_opportunities(bigint) to importer;
