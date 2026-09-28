-- delete_my_account(): a signed-in student deletes their own account
-- (decision 0004). It removes their auth.users row; everything that
-- references it with `on delete cascade` goes too (profiles now, and every
-- future table of student data, which must reference it the same way).
--
-- security definer because students can't delete from auth.users
-- themselves; that is exactly why it only ever deletes auth.uid().

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = caller;
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the calling student''s own account and, by cascade, all their data. Decision 0004.';

-- New functions are executable by everyone by default. Only signed-in
-- students may call this one.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
