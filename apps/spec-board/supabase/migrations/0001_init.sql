-- The Fable System — initial schema (spec §9)
-- Single-user internal tool; RLS is intentionally deferred (low priority at
-- this scale) and access goes through the service role key, server-side only.

create extension if not exists "pgcrypto";

create table if not exists visions (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists specs (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references visions (id) on delete cascade,
  content text not null,
  confidence text,
  created_at timestamptz not null default now()
);

create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references visions (id) on delete cascade,
  claim text not null,
  evidence_tag text not null check (evidence_tag in ('verified', 'inference', 'unconfirmed')),
  source_url text,
  channel text,
  created_at timestamptz not null default now()
);

create table if not exists board_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat text,
  source_links text[]
);

create table if not exists board_responses (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references specs (id) on delete cascade,
  member_id uuid not null references board_members (id) on delete cascade,
  critique text not null,
  created_at timestamptz not null default now()
);

create index if not exists specs_vision_id_idx on specs (vision_id);
create index if not exists findings_vision_id_idx on findings (vision_id);
create index if not exists board_responses_spec_id_idx on board_responses (spec_id);
