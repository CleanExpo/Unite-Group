-- CI bootstrap for the DESTRUCTIVE suite's own database (UNI-2597).
--
-- Applied only to `spine_migrations`, never to the database the other suites use.
-- Companion to 00_extensions.sql, which is applied to both.
--
-- WHY A SECOND DATABASE EXISTS
-- tests/integration/idempotency.test.ts runs `drop schema core, marketing, …
-- cascade` — that IS what it tests. Sharing one database with the suites that
-- read the seeded fixtures deletes their tables mid-query. The alternatives were
-- tried and rejected in UNI-2597: ordering the files does not help (idempotency
-- still sorts ahead of them and leaves the schemas rebuilt but unseeded), and
-- restoring afterwards needs an RLS-bypassing role plus a durable ordering
-- dependency. A second database in the SAME ephemeral cluster is one
-- `create database`, and it removes the shared state rather than sequencing
-- access to it.
--
-- WHY THIS FILE IS NEEDED AT ALL
-- Roles are cluster-wide, so `authenticated`, `postgres` and its grants from
-- 00_extensions.sql all carry over. Schemas are NOT: Supabase creates `auth`
-- only in the default `postgres` database. migrations/0001 defines
-- core.current_org_id() and core.current_person_id() as SQL functions whose
-- bodies call auth.jwt(), and PostgreSQL validates a SQL function body at
-- CREATE time — so without `auth` here, the very first migration fails with
-- `schema "auth" does not exist` and the suite reports a missing-schema error
-- that looks nothing like its cause.
--
-- FIDELITY IS NOT AT STAKE HERE, WHICH IS WHY A SHIM IS ACCEPTABLE.
-- This database exists to prove the migrations APPLY and TEAR DOWN cleanly. It
-- never asserts anything about RLS behaviour: no policy is exercised, no query
-- runs as `authenticated`, nothing reads a JWT. The suites that DO test tenant
-- isolation stay on the real Supabase database, against the real auth schema.
-- A shim here would only become dishonest if an RLS assertion moved onto it —
-- so if one ever does, this file is the thing to delete, not to extend.

create schema if not exists auth;

-- Supabase's own definitions, so that a function created here resolves exactly
-- as it does next door. `set search_path = ''` matches the migrations' own
-- convention and forces the qualified references below.
create or replace function auth.jwt()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim', true), ''),
    nullif(pg_catalog.current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
    (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to authenticated;
grant execute on function auth.jwt(), auth.uid() to authenticated;

-- Assert rather than assume, in the same spirit as 00_extensions.sql: fail here
-- with a plain statement about the environment rather than three files later
-- against application SQL.
do $$
begin
  if to_regprocedure('auth.jwt()') is null then
    raise exception
      'auth.jwt() is still unavailable — migrations/0001 cannot create its tenant helpers';
  end if;
end
$$;
