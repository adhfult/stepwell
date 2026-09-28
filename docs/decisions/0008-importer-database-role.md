# 0008: Import jobs connect as a dedicated `importer` database role

- Date: 2026-09-28
- Status: accepted (changes how the loader in the v1 expansion, Section 3.1,
  reaches the database)

## Context
The pipeline stages rows in the `ingest` schema, which is deliberately not
exposed to Supabase's Data API. The service-role client planned in Section
3.1 talks only through that API, so it can't reach `ingest`. The service-role
key also bypasses every RLS policy, which is far more than an import job needs.

## Decision
- Jobs connect straight to Postgres with the `pg` library as a login role
  `importer`, created without a password by a migration.
- `importer` may only use the `ingest` schema and execute its functions
  (`security definer`, fixed `search_path`), which do all reading and writing.
  It has no rights on user tables or `auth`.
- From GitHub Actions the connection goes through Supabase's shared pooler in
  session mode (IPv4; direct connections are IPv6-only on the free plan), as
  user `importer.<project-ref>`.
- Locally, `supabase/seed.sql` gives it a known password. In the cloud the
  owner sets the password once in the SQL editor and stores the connection
  string as the `IMPORT_DATABASE_URL` GitHub Actions secret.

## Alternatives considered
- Expose `ingest` to the API for `service_role` only: works, but puts staging
  tables behind a public endpoint and keeps the all-powerful key in CI.
- Connect as `postgres`: simplest, but a leaked secret would expose everything.

## Consequences
- One new dependency (`pg`) and one new secret; the service-role key is not
  used by the pipeline.
- Every write the jobs make goes through a reviewed SQL function, testable
  with pgTAP.
- Setting up the cloud project needs one manual step (the role's password).
