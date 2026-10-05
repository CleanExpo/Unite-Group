-- =============================================================================
-- Migration: public_agent_quota — durable daily ceiling + kill switch for the
-- public site agent (UNI-2917, spec §5.2(3))
-- FOUNDER-GATED. Validate on a Supabase database branch; never apply to prod
-- directly. Until this is applied, /api/agent and /api/agent/voice/signed-url
-- refuse every request (the quota claim fails closed).
--
-- Two tables and one function:
--   public_agent_controls     one row per founder: the kill switch (`enabled`,
--                             default false = closed) and the daily ceilings.
--                             Flipping `enabled` closes both public endpoints
--                             without a deploy.
--   public_agent_usage_daily  per-day counters, keyed by scope. scope is either
--                             'key:<publishable key>' or '*founder' (the
--                             founder-wide total). Day is the Brisbane calendar
--                             day (AEST, no DST).
--   claim_public_agent_quota  atomic check-and-increment, one round trip. Row
--                             locks make the ceiling hold across every
--                             serverless instance and region — the gap the
--                             in-memory limiter in the routes cannot close.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.claim_public_agent_quota(uuid, text, text);
--   DROP TABLE IF EXISTS public.public_agent_usage_daily;
--   DROP TABLE IF EXISTS public.public_agent_controls;
-- =============================================================================

create table if not exists public.public_agent_controls (
  founder_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  chat_daily_per_key integer not null default 200 check (chat_daily_per_key >= 0),
  chat_daily_per_founder integer not null default 500 check (chat_daily_per_founder >= 0),
  voice_daily_per_key integer not null default 20 check (voice_daily_per_key >= 0),
  voice_daily_per_founder integer not null default 50 check (voice_daily_per_founder >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_agent_usage_daily (
  founder_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  kind text not null check (kind in ('chat', 'voice')),
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (founder_id, scope, kind, day)
);

alter table public.public_agent_controls enable row level security;
alter table public.public_agent_controls force row level security;
alter table public.public_agent_usage_daily enable row level security;
alter table public.public_agent_usage_daily force row level security;

-- Founder reads both tables and may flip their own kill switch / ceilings.
-- No anon policy: the public routes reach these only through the service role.
drop policy if exists public_agent_controls_founder_select on public.public_agent_controls;
create policy public_agent_controls_founder_select
  on public.public_agent_controls for select
  using (founder_id = auth.uid());

drop policy if exists public_agent_controls_founder_update on public.public_agent_controls;
create policy public_agent_controls_founder_update
  on public.public_agent_controls for update
  using (founder_id = auth.uid())
  with check (founder_id = auth.uid());

drop policy if exists public_agent_usage_daily_founder_select on public.public_agent_usage_daily;
create policy public_agent_usage_daily_founder_select
  on public.public_agent_usage_daily for select
  using (founder_id = auth.uid());

-- Returns 'ok' | 'paused' | 'key_ceiling' | 'founder_ceiling'.
-- 'paused' covers both an explicit enabled=false and a founder with no
-- controls row: absent configuration is closed, never open.
create or replace function public.claim_public_agent_quota(
  p_founder_id uuid,
  p_scope text,
  p_kind text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  c public.public_agent_controls;
  d date := (now() at time zone 'Australia/Brisbane')::date;
  key_limit integer;
  founder_limit integer;
  key_count integer;
  founder_count integer;
begin
  if p_kind not in ('chat', 'voice') then
    raise exception 'claim_public_agent_quota: invalid kind %', p_kind;
  end if;
  if p_scope is null or p_scope = '' or left(p_scope, 1) = '*' then
    raise exception 'claim_public_agent_quota: invalid scope';
  end if;

  select * into c from public.public_agent_controls where founder_id = p_founder_id;
  if not found or not c.enabled then
    return 'paused';
  end if;

  if p_kind = 'chat' then
    key_limit := c.chat_daily_per_key;
    founder_limit := c.chat_daily_per_founder;
  else
    key_limit := c.voice_daily_per_key;
    founder_limit := c.voice_daily_per_founder;
  end if;

  insert into public.public_agent_usage_daily (founder_id, scope, kind, day)
  values (p_founder_id, p_scope, p_kind, d), (p_founder_id, '*founder', p_kind, d)
  on conflict do nothing;

  -- Lock order is fixed (key row, then founder row) so concurrent claims for
  -- different keys of one founder cannot deadlock.
  select count into key_count from public.public_agent_usage_daily
  where founder_id = p_founder_id and scope = p_scope and kind = p_kind and day = d
  for update;

  select count into founder_count from public.public_agent_usage_daily
  where founder_id = p_founder_id and scope = '*founder' and kind = p_kind and day = d
  for update;

  if key_count >= key_limit then
    return 'key_ceiling';
  end if;
  if founder_count >= founder_limit then
    return 'founder_ceiling';
  end if;

  update public.public_agent_usage_daily
  set count = count + 1
  where founder_id = p_founder_id and kind = p_kind and day = d
    and scope in (p_scope, '*founder');

  return 'ok';
end;
$$;

revoke execute on function public.claim_public_agent_quota(uuid, text, text) from public;
revoke execute on function public.claim_public_agent_quota(uuid, text, text) from anon, authenticated;
grant execute on function public.claim_public_agent_quota(uuid, text, text) to service_role;
