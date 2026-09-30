-- Security audit 2026-09-29: delete_my_account() could be called straight
-- from the Data API with a copied login cookie, skipping the app's password
-- re-check. The app's check is a real sign-in, which updates
-- last_sign_in_at, so the function now also requires a sign-in within the
-- last 10 minutes.

create or replace function public.delete_my_account()
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
  if not exists (
    select from auth.users where id = caller and last_sign_in_at > now() - interval '10 minutes'
  ) then
    raise exception 'Sign in again to delete your account' using errcode = '42501';
  end if;

  delete from auth.users where id = caller;
end;
$$;
