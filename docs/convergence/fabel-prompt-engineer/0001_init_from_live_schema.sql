-- 0001_init_from_live_schema.sql
-- Fabel-Prompt-Engineer — initial schema, reconstructed 12/06/2026 from the
-- LIVE Supabase project "Fabel-Prompt-Engineer" (ref yhteftfnoegmdkimzzjd)
-- via MCP schema inspection. Covers every table, column, default, FK and
-- check constraint the app uses today.
--
-- KNOWN GAP: RLS is ENABLED on every table but the policy definitions were
-- not readable from this session. Before relying on this file, dump the real
-- policies from the live project:
--   supabase db dump --db-url "$LIVE_DB_URL" --schema public -f schema_dump.sql
-- and reconcile (see handover.md, Prompt 1).

create table if not exists public.visions (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.specs (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references public.visions(id),
  content text not null,
  confidence text,
  created_at timestamptz not null default now(),
  critique text,
  critic_model text,
  approved_at timestamptz
);

-- The Evidence Standard lives here: tagged claims extracted from specs.
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references public.visions(id),
  claim text not null,
  evidence_tag text not null
    check (evidence_tag = any (array['verified', 'inference', 'unconfirmed'])),
  source_url text,
  channel text,
  created_at timestamptz not null default now()
);

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat text,
  source_links text[]
);

create table if not exists public.board_responses (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.specs(id),
  member_id uuid not null references public.board_members(id),
  critique text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  source_repo text not null,
  path text not null,
  title text not null,
  content text not null,
  sha text,
  updated_at timestamptz not null default now(),
  fts tsvector generated always as
    (to_tsvector('english'::regconfig, (title || ' '::text) || content)) stored
);

alter table public.visions enable row level security;
alter table public.specs enable row level security;
alter table public.findings enable row level security;
alter table public.board_members enable row level security;
alter table public.board_responses enable row level security;
alter table public.knowledge_docs enable row level security;

-- TODO(Prompt 1): replace with the real policies dumped from the live project.
