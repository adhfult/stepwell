-- CareerOneStop license IDs can contain &, ( and ) ("08-KEYL(G)L"); allow them.
alter table public.career_licenses drop constraint career_licenses_id_valid;
alter table public.career_licenses
  add constraint career_licenses_id_valid check (license_id ~ '^[A-Za-z0-9&()-]{1,40}$');
