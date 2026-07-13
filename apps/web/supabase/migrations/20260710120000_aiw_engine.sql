-- AI-Website (AIW) engine — Phase 2 schema.
--
-- STATUS: NOT YET APPLIED. Apply only on a Supabase DB branch after verifying the
-- `vector`, `pg_cron`, and `pg_net` extensions are available (judge NOT-CHECKED item).
-- Never `supabase db push` against prod (migration history has diverged before).
--
-- Design (from the adversarial review):
--   * Public visitors NEVER write `crm_leads` directly (it is founder-RLS-scoped, so a
--     public write would need the service-role key and bypass RLS). They insert into the
--     append-only `aiw_lead_intake` via a SECURITY DEFINER RPC; a trusted server job
--     promotes intake rows into `crm_leads`, stamping the founder id.
--   * `aiw_embeddings` and `aiw_drip_queue` are service-role only (no anon policies).
--   * `aiw_drip_queue` enforces unique(lead_id, drip_step) for idempotent enrolment.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 1. Append-only public lead intake (no public reads)
-- ---------------------------------------------------------------------------
create table if not exists public.aiw_lead_intake (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  source_path       text not null,
  name              text,
  email             text,
  phone             text,
  message           text,
  qualifying        jsonb not null default '[]'::jsonb,
  promoted_at       timestamptz,
  promoted_lead_id  uuid
);

alter table public.aiw_lead_intake enable row level security;
-- No SELECT/INSERT policies for anon: PostgREST cannot read or write it directly.
-- Inserts flow exclusively through aiw_submit_lead() below. The service role (used by
-- the promotion job) bypasses RLS.

create or replace function public.aiw_submit_lead(
  p_source_path text,
  p_name        text,
  p_email       text default null,
  p_phone       text default null,
  p_message     text default null,
  p_qualifying  jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(p_email, '') = '' and coalesce(p_phone, '') = '' then
    raise exception 'email or phone required';
  end if;

  insert into public.aiw_lead_intake (source_path, name, email, phone, message, qualifying)
  values (left(p_source_path, 300), left(p_name, 120), left(p_email, 200),
          left(p_phone, 40), left(p_message, 2000), coalesce(p_qualifying, '[]'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.aiw_submit_lead(text, text, text, text, text, jsonb)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. RAG corpus embeddings (service-role only)
-- ---------------------------------------------------------------------------
create table if not exists public.aiw_embeddings (
  id           uuid primary key default gen_random_uuid(),
  source_path  text not null,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now(),
  unique (source_path, chunk_index)
);

alter table public.aiw_embeddings enable row level security;
-- No anon policies: only the service role (server) reads/writes embeddings.

-- ---------------------------------------------------------------------------
-- 3. Drip queue (service-role only, idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.aiw_drip_queue (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null,
  drip_step   integer not null,
  status      text not null default 'pending',
  send_at     timestamptz not null default now(),
  attempts    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (lead_id, drip_step)   -- idempotency: on conflict do nothing on enrolment
);

alter table public.aiw_drip_queue enable row level security;
-- No anon policies: only the service role enrols/dispatches.

-- ---------------------------------------------------------------------------
-- 4. Drip runner (pg_cron + pg_net) — INTENTIONALLY NOT CREATED HERE.
-- Enable pg_cron/pg_net on a DB branch first, then a follow-up migration schedules a
-- per-minute job that pulls due `aiw_drip_queue` rows (status='pending' and
-- send_at <= now() and attempts < 3) and net.http_post()s them to the send route.
-- ---------------------------------------------------------------------------
