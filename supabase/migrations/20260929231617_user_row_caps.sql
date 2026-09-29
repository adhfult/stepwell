-- Per-student row caps (security review of the saved plan): saved scholarship
-- and college ids have no foreign key, and plan steps are the student's own,
-- so without a cap one scripted account could fill these tables. The caps
-- are far above real use: 1,000 saved items, 500 plan steps.

create function public.enforce_row_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cap integer := tg_argv[0]::integer;
  v_count integer;
begin
  -- One insert at a time per student, so two tabs can't both slip under the cap.
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || new.user_id::text, 0));
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into v_count using new.user_id;
  if v_count >= v_cap then
    raise exception 'row cap reached on %', tg_table_name using errcode = '54000'; -- program_limit_exceeded
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_row_cap() from public, anon, authenticated;

create trigger saved_items_row_cap
  before insert on public.saved_items
  for each row execute function public.enforce_row_cap('1000');

create trigger plan_items_row_cap
  before insert on public.plan_items
  for each row execute function public.enforce_row_cap('500');
