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
