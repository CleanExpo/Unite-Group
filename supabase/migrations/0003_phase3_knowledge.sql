-- Phase 3: the 2nd Brain vault, synced into Postgres for FTS retrieval.
-- (Captured retroactively — this was applied to the live project on
-- 2026-06-12 during Phase 3 execution; kept here so the schema is fully
-- reproducible from the repo.)

create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  source_repo text not null,
  path text not null,
  title text not null,
  content text not null,
  sha text,
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', title || ' ' || content)
  ) stored,
  unique (source_repo, path)
);

create index if not exists knowledge_docs_fts_idx on knowledge_docs using gin (fts);

-- Locked to the service role: no anon access (app is server-side only).
alter table knowledge_docs enable row level security;
