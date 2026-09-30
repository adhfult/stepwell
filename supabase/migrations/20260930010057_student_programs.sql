-- Summer programs and research: a curated list of free or paid programs from
-- federal agencies, national labs, states and public universities.
-- Spec: docs/specs/programs.md.

insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'official_programs',
  'Official summer programs and research (curated)',
  'manual',
  'https://www.usa.gov/',
  null,
  '2026-09-29',
  true,
  interval '1 day',
  'Programs listed from their official federal, state and public university pages; each listing links to its source and says when Stepwell last checked it.'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution',
             'scholarship', 'opportunity', 'student_program')
  );

create table public.student_programs (
  id text primary key constraint student_programs_id_valid check (id ~ '^[a-z]{2}-[a-z0-9-]{2,80}$'),
  title text not null constraint student_programs_title_valid check (char_length(title) between 1 and 200),
  sponsor text not null constraint student_programs_sponsor_valid check (char_length(sponsor) between 1 and 200),
  sponsor_type text not null constraint student_programs_sponsor_type_valid check (sponsor_type in ('federal', 'state', 'university')),
  kind text not null constraint student_programs_kind_valid check (kind in ('summer_program', 'internship', 'research')),
  url text not null constraint student_programs_url_valid check (url ~ '^https://[^\s]+$'),
  stages text[] not null
    constraint student_programs_stages_valid check (
      cardinality(stages) > 0 and stages <@ array['middle_school', 'high_school', 'college', 'adult']
    ),
  -- Empty means national: shown for every state.
  states text[] not null default '{}'
    constraint student_programs_states_valid check (array_to_string(states, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$'),
  remote boolean not null default false,
  paid boolean not null,
  pay_text text constraint student_programs_pay_text_valid check (char_length(pay_text) <= 120),
  deadline_kind text not null
    constraint student_programs_deadline_kind_valid check (deadline_kind in ('date', 'usually', 'rolling', 'unknown')),
  deadline_date date,
  deadline_month_day text constraint student_programs_deadline_month_day_valid check (deadline_month_day ~ '^\d{2}-\d{2}$'),
  who_text text constraint student_programs_who_text_valid check (char_length(who_text) <= 300),
  description text not null constraint student_programs_description_valid check (char_length(description) between 1 and 500),
  checked_at date not null,
  source_id text not null default 'official_programs' references public.sources (id),
  retrieved_at timestamptz not null
);

comment on table public.student_programs is
  'Curated official summer programs, internships and research for students. Public read; replaced by ingest.merge_student_programs().';

alter table public.student_programs enable row level security;
create policy "Anyone can read student programs" on public.student_programs for select to anon, authenticated using (true);
revoke all on table public.student_programs from anon, authenticated;
grant select on table public.student_programs to anon, authenticated;

create function ingest.merge_student_programs(p_run_id bigint)
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
    where r.id = p_run_id and r.status = 'running' and r.source_id = 'official_programs'
  ) then
    raise exception 'Run % is not a running official programs run', p_run_id;
  end if;

  create temporary table pg_temp.incoming on commit drop as
  select x.*
  from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(
         id text, title text, sponsor text, sponsor_type text, kind text, url text, stages text[],
         states text[], remote boolean, paid boolean, pay_text text, deadline_kind text,
         deadline_date date, deadline_month_day text, who_text text, description text, checked_at date
       )
  where s.run_id = p_run_id and s.kind = 'student_program' and s.status = 'valid';

  if not exists (select from pg_temp.incoming) then
    raise exception 'Refusing to merge zero programs';
  end if;

  select count(*) into v_added
  from pg_temp.incoming i where not exists (select from public.student_programs p where p.id = i.id);
  select count(*) into v_changed
  from pg_temp.incoming i join public.student_programs p on p.id = i.id
  where (p.title, p.url, p.pay_text, p.deadline_date, p.deadline_month_day, p.description, p.checked_at)
        is distinct from (i.title, i.url, i.pay_text, i.deadline_date, i.deadline_month_day, i.description, i.checked_at);

  delete from public.student_programs p where not exists (select from pg_temp.incoming i where i.id = p.id);
  get diagnostics v_removed = row_count;

  insert into public.student_programs (
    id, title, sponsor, sponsor_type, kind, url, stages, states, remote, paid, pay_text,
    deadline_kind, deadline_date, deadline_month_day, who_text, description, checked_at, retrieved_at
  )
  select
    i.id, i.title, i.sponsor, i.sponsor_type, i.kind, i.url, i.stages, coalesce(i.states, '{}'),
    coalesce(i.remote, false), i.paid, i.pay_text, i.deadline_kind, i.deadline_date,
    i.deadline_month_day, i.who_text, i.description, i.checked_at, now()
  from pg_temp.incoming i
  on conflict (id) do update
  set title = excluded.title, sponsor = excluded.sponsor, sponsor_type = excluded.sponsor_type,
      kind = excluded.kind, url = excluded.url, stages = excluded.stages, states = excluded.states,
      remote = excluded.remote, paid = excluded.paid, pay_text = excluded.pay_text,
      deadline_kind = excluded.deadline_kind, deadline_date = excluded.deadline_date,
      deadline_month_day = excluded.deadline_month_day, who_text = excluded.who_text,
      description = excluded.description, checked_at = excluded.checked_at,
      retrieved_at = excluded.retrieved_at;

  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_student_programs(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_student_programs(bigint) to importer;

-- Saving a program to the plan: no foreign key (the merge replaces rows),
-- like scholarships and internships.
alter table public.saved_items
  add column student_program_id text
    constraint saved_items_student_program_id_valid check (student_program_id ~ '^[a-z]{2}-[a-z0-9-]{2,80}$'),
  add constraint saved_items_one_per_student_program unique (user_id, student_program_id);

alter table public.saved_items drop constraint saved_items_exactly_one;
alter table public.saved_items
  add constraint saved_items_exactly_one
    check (num_nonnulls(onet_code, scholarship_id, unitid, opportunity_id, ap_course_code, student_program_id) = 1);

grant insert (onet_code, scholarship_id, unitid, opportunity_id, ap_course_code, student_program_id, title)
  on table public.saved_items to authenticated;
