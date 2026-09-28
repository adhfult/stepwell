-- Pay and outlook for careers, from O*NET Web Services (My Next Move job
-- outlook): BLS wage estimates and 2024 to 2034 employment projections.
-- Spec: docs/specs/career-explorer.md, step 6.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'onet_outlook',
  'O*NET Web Services: job outlook',
  'api',
  'https://services.onetcenter.org/',
  'https://services.onetcenter.org/terms',
  '2026-09-28',
  true,
  interval '3 months',
  'Pay from U.S. Bureau of Labor Statistics wage estimates and outlook from BLS 2024 to 2034 employment projections, via O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (kind in ('occupation', 'occupation_outlook'));

create table public.occupation_outlook (
  onet_code text primary key references public.occupations (onet_code) on delete cascade,
  outlook text not null
    constraint occupation_outlook_outlook_valid check (outlook in ('bright', 'average', 'below_average')),
  -- Why the outlook is bright: grow (grows rapidly), openings (many
  -- openings), emerging (new and emerging).
  bright_reasons text[] not null default '{}'
    constraint occupation_outlook_reasons_valid check (bright_reasons <@ array['grow', 'openings', 'emerging']),
  -- The SOC code BLS published the wages for (can be broader than the career).
  wage_soc_code text
    constraint occupation_outlook_wage_soc_valid check (wage_soc_code ~ '^\d{2}-\d{4}$'),
  -- Whole dollars a year; dollars and cents an hour. Empty = not published.
  annual_low integer constraint occupation_outlook_annual_low_valid check (annual_low > 0),
  annual_median integer constraint occupation_outlook_annual_median_valid check (annual_median > 0),
  annual_high integer constraint occupation_outlook_annual_high_valid check (annual_high > 0),
  hourly_low numeric(6, 2) constraint occupation_outlook_hourly_low_valid check (hourly_low > 0),
  hourly_median numeric(6, 2) constraint occupation_outlook_hourly_median_valid check (hourly_median > 0),
  hourly_high numeric(6, 2) constraint occupation_outlook_hourly_high_valid check (hourly_high > 0),
  -- Figures above the most BLS publishes, shown as "$239,200 or more".
  or_more text[] not null default '{}'
    constraint occupation_outlook_or_more_valid check (
      or_more <@ array['annual_low', 'annual_median', 'annual_high', 'hourly_low', 'hourly_median', 'hourly_high']
    ),
  source_id text not null default 'onet_outlook' references public.sources (id),
  retrieved_at timestamptz not null
);

comment on table public.occupation_outlook is
  'Pay and outlook per career. Written only by ingest.merge_occupation_outlook().';

alter table public.occupation_outlook enable row level security;

create policy "Anyone can read occupation outlook"
  on public.occupation_outlook for select to anon, authenticated using (true);

revoke all on table public.occupation_outlook from anon, authenticated;
grant select on table public.occupation_outlook to anon, authenticated;

-- Moves a run's valid outlook records into public.occupation_outlook in one
-- transaction. Careers no longer listed lose their row; codes we don't have
-- as occupations are skipped.
create function ingest.merge_occupation_outlook(p_run_id bigint)
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
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'onet_outlook'
  ) then
    raise exception 'Run % is not a running O*NET outlook run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(
         onet_code text, outlook text, bright_reasons text[], wage_soc_code text,
         annual_low integer, annual_median integer, annual_high integer,
         hourly_low numeric, hourly_median numeric, hourly_high numeric, or_more text[]
       )
  where s.run_id = p_run_id and s.kind = 'occupation_outlook' and s.status = 'valid'
    and exists (select from public.occupations o where o.onet_code = x.onet_code);

  -- Backstop for the runner's circuit breaker: never replace data with nothing.
  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero outlook records';
  end if;

  select count(*) into v_added
  from pg_temp.incoming i
  where not exists (select from public.occupation_outlook o where o.onet_code = i.onet_code);

  select count(*) into v_changed
  from pg_temp.incoming i
  join public.occupation_outlook o on o.onet_code = i.onet_code
  where (o.outlook, o.bright_reasons, o.annual_median, o.hourly_median)
        is distinct from (i.outlook, i.bright_reasons, i.annual_median, i.hourly_median);

  delete from public.occupation_outlook o
  where not exists (select from pg_temp.incoming i where i.onet_code = o.onet_code);
  get diagnostics v_removed = row_count;

  insert into public.occupation_outlook (
    onet_code, outlook, bright_reasons, wage_soc_code,
    annual_low, annual_median, annual_high, hourly_low, hourly_median, hourly_high,
    or_more, source_id, retrieved_at
  )
  select
    i.onet_code, i.outlook, coalesce(i.bright_reasons, '{}'), i.wage_soc_code,
    i.annual_low, i.annual_median, i.annual_high, i.hourly_low, i.hourly_median, i.hourly_high,
    coalesce(i.or_more, '{}'), 'onet_outlook', now()
  from pg_temp.incoming i
  on conflict (onet_code) do update
  set outlook = excluded.outlook,
      bright_reasons = excluded.bright_reasons,
      wage_soc_code = excluded.wage_soc_code,
      annual_low = excluded.annual_low,
      annual_median = excluded.annual_median,
      annual_high = excluded.annual_high,
      hourly_low = excluded.hourly_low,
      hourly_median = excluded.hourly_median,
      hourly_high = excluded.hourly_high,
      or_more = excluded.or_more,
      retrieved_at = excluded.retrieved_at;

  drop table pg_temp.incoming;

  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_occupation_outlook(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_occupation_outlook(bigint) to importer;
