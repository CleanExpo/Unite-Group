-- CI bootstrap: extensions the spine migrations assume already exist (UNI-2580).
--
-- No migration runs `create extension`. On the hosted projects pgvector was
-- enabled out of band, so migrations/0002 can simply declare `embedding
-- public.vector(384)` and index it with `using hnsw (... public.vector_cosine_ops)`.
-- A fresh database has no such history, and the migration dies with:
--
--   psql:migrations/0002_modules.sql:88: ERROR: type "public.vector" does not exist
--
-- This file is NOT a migration and must not become one: it records an
-- environment prerequisite of the hosted databases, it does not change their
-- schema. Applied only by the CI job, before migrations/0001.
--
-- SCHEMA PLACEMENT IS THE WHOLE POINT. The migrations name the type
-- `public.vector`, fully qualified. Supabase's own convention is to install
-- extensions into `extensions`, so simply enabling pgvector is not sufficient —
-- if it lands anywhere but `public`, every `public.vector` reference still fails
-- to resolve and the error above is unchanged. Hence: create, then relocate if
-- it is not already there, then assert.

create extension if not exists vector;

-- Relocate only when needed. `alter extension ... set schema public` raises if
-- the extension is already in public, so this cannot be unconditional.
do $$
begin
  if to_regtype('public.vector') is null then
    alter extension vector set schema public;
  end if;
end
$$;

-- Assert rather than assume. Without this the job would carry on to the
-- migrations and fail there instead, reporting a confusing "type does not
-- exist" against application SQL rather than a plain statement that the
-- environment was not prepared.
do $$
begin
  if to_regtype('public.vector') is null then
    raise exception
      'public.vector is still unavailable after enabling pgvector — the spine migrations cannot build';
  end if;
end
$$;

-- ── Let `postgres` set pgvector's scan GUCs ──────────────────────────────────
--
-- migrations/0005 creates functions carrying `set hnsw.iterative_scan =
-- 'strict_order'` (and three more) in the function definition. As postgres that
-- is "permission denied to set parameter": the Supabase image runs supautils,
-- which strips superuser from postgres, and the hosted databases had these
-- functions created by a role that still had it.
--
-- The alternative was to build the whole schema as supabase_admin. That was
-- tried and is WRONG, for a reason worth recording: tests/integration/
-- idempotency.test.ts drops the eight spine schemas and re-applies every
-- migration ITSELF, through the ordinary connection. If a different role built
-- them, that test dies with "must be owner of schema core" — and the role that
-- rebuilds them still needs these same GUC rights anyway. So the privilege has
-- to land on the role the tests actually use.
--
-- GRANT SET ON PARAMETER (PostgreSQL 15+) grants exactly that and nothing else:
-- four named parameters, no superuser, no ownership change. This must run after
-- `create extension vector` above, because a parameter cannot be granted until
-- the library defining it is loaded and the name is recognised.
grant set on parameter
  hnsw.iterative_scan,
  hnsw.ef_search,
  hnsw.max_scan_tuples,
  hnsw.scan_mem_multiplier
to postgres;

-- ── Let `postgres` load the seed ─────────────────────────────────────────────
--
-- core.party and six siblings are FORCE ROW LEVEL SECURITY, which binds even
-- the table owner, and seed/0001_seed.sql inserts rows with no JWT context to
-- satisfy the policies — its own header says "Run as service role (RLS
-- bypassed)". The CI job seeds as supabase_admin, but
-- tests/integration/idempotency.test.ts also re-seeds in afterAll (it drops the
-- schemas, so it must put the fixtures back for the suites that follow), and
-- that runs on the ordinary test connection.
--
-- Stated explicitly rather than relying on whatever the image happens to give
-- postgres, because "it probably already has it" is the kind of assumption that
-- has cost this job several CI rounds already.
--
-- THIS DOES NOT WEAKEN THE RLS SUITES. Verified on PostgreSQL 16: BYPASSRLS
-- belongs to the role in effect, and every suite runs its queries after
-- `set local role authenticated` (data-access/client.ts). With the login role
-- holding BYPASSRLS, a direct select returned 4 rows while the same select
-- after `set local role authenticated` with no JWT returned 0 — the policies
-- still bind exactly where the tests exercise them.
alter role postgres bypassrls;
