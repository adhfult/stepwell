-- Local development only (runs on `supabase db reset`, never on the cloud).
-- The importer role's local password (decision 0008). The cloud password is
-- set once by the owner in the SQL editor.
alter role importer with password 'importer';
