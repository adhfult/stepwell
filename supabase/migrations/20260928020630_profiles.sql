-- Profiles: one row per account, created by a trigger when someone signs up.
-- Spec: docs/specs/accounts-and-profile.md (Data). Decisions 0002 and 0005.
--
-- Every rule the forms check with zod is repeated here as a check constraint,
-- because a signed-in student can send requests to the Data API directly and
-- skip our forms.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Optional; "a first name or nickname is fine". Stored trimmed.
  nickname text
    constraint profiles_nickname_valid check (
      char_length(nickname) between 1 and 40
      and nickname = btrim(nickname)
      and nickname !~ '[[:cntrl:]]'
    ),

  -- Empty until the profile form is filled in (the row exists first).
  stage text
    constraint profiles_stage_valid check (
      stage in ('middle_school', 'high_school', 'college', 'adult_learner')
    ),

  -- The 50 states, DC, and five territories.
  state text
    constraint profiles_state_valid check (
      state in (
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC', 'PR', 'GU', 'VI', 'AS', 'MP'
      )
    ),

  -- Expected graduation year. The form allows this year - 1 to this year + 8;
  -- this wider range is the backstop.
  grad_year smallint
    constraint profiles_grad_year_valid check (grad_year between 1950 and 2040),

  -- Only the fact that the person is 13 or older; never a birth date.
  age_confirmed boolean not null
    constraint profiles_age_confirmed check (age_confirmed),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Adult learners aren't asked for a graduation year.
  constraint profiles_no_grad_year_for_adult_learners check (
    stage is distinct from 'adult_learner' or grad_year is null
  )
);

comment on table public.profiles is
  'One row per account. Created by public.handle_new_user(); deleted with the auth user.';

-- Row Level Security: a signed-in student sees and edits only their own row.
alter table public.profiles enable row level security;

create policy "Students read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Students update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Privileges: nothing by default, then only what the app needs. No insert or
-- delete: the trigger creates rows and account deletion removes them. Only
-- these four columns can be changed; id, age_confirmed and the timestamps can't.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (nickname, stage, state, grad_year) on table public.profiles to authenticated;

-- Keep updated_at current on every change.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when someone signs up, and refuse the sign-up unless the
-- sign-up form confirmed age (decision 0005). This is the real 13+ gate:
-- anyone can call Supabase Auth directly with the publishable key, skipping
-- our Server Action, but not this trigger. The flag is copied once; later
-- edits to user metadata never touch the profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'age_confirmed', '') <> 'true' then
    raise exception 'Sign-up requires age confirmation';
  end if;

  insert into public.profiles (id, age_confirmed)
  values (new.id, true);

  return new;
end;
$$;

-- New functions are executable by everyone by default; nobody needs to call
-- this one directly (the trigger doesn't need the grant).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
