-- CCF Centris — give the service role its table privileges explicitly.
--
-- The site reads and writes Postgres only with the service role (see
-- 0010_firebase_auth.sql). Earlier migrations relied on Supabase's default
-- privileges to grant it access to each new table. Newer Supabase projects no
-- longer grant those automatically, so on a fresh project the service role
-- gets "permission denied" on every table. State the grants here instead.
--
-- Where the defaults already applied (older projects) this changes nothing.
-- anon and authenticated get nothing new: no member session or public key
-- reaches the database any more.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
