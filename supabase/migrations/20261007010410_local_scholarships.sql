-- More scholarships (docs/specs/more-scholarships.md, decision 0015): an
-- optional county on the profile for the local scholarship directory, and
-- private national programs in the curated scholarship list.

-- County: 5-digit Census FIPS code. The profile form checks it belongs to
-- the student's state; this check backs up the format for direct API calls.
-- Existing RLS keeps it readable and changeable only by the student.
alter table public.profiles
  add column county text constraint profiles_county_valid check (county ~ '^\d{5}$');

grant update (county) on table public.profiles to authenticated;

-- Private programs have no state, like federal ones
-- (scholarships_federal_no_state already allows that).
alter table public.scholarships drop constraint scholarships_sponsor_type_valid;
alter table public.scholarships
  add constraint scholarships_sponsor_type_valid check (sponsor_type in ('federal', 'state', 'private'));
