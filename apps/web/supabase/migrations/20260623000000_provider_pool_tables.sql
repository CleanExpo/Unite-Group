-- Provider-pool persistence (DB phase of the multi-provider Console).
-- Matches makeSupabaseStore() in src/lib/provider-pool/repository.ts exactly.
-- Founder-scoped + RLS (single-tenant). Additive only.
-- NOTE: prod apply is gated — apply via the approved DB workflow, never autonomously.

create table if not exists public.provider_accounts (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null,
  provider      text not null check (provider in ('claude','openai','minimax','gemini','openrouter')),
  label         text not null default '',
  vault_entry_id uuid,
  enabled       boolean not null default true,
  -- PlanShape: {kind:'windowed',caps:[...]} | {kind:'prepaid',purchasedUnits:n}
  plan          jsonb not null default '{}'::jsonb,
  allow_metered boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.provider_quota_events (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null,
  account_id    uuid not null references public.provider_accounts(id) on delete cascade,
  at            timestamptz not null default now(),
  model         text,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  run_unit      numeric not null default 0,
  lane          text,
  outcome       text not null default 'ok' check (outcome in ('ok','error','rate_limited')),
  reset_at      timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists provider_accounts_founder_idx on public.provider_accounts (founder_id);
create index if not exists provider_quota_events_founder_at_idx on public.provider_quota_events (founder_id, at desc);
create index if not exists provider_quota_events_account_idx on public.provider_quota_events (account_id);

alter table public.provider_accounts      enable row level security;
alter table public.provider_quota_events  enable row level security;

drop policy if exists provider_accounts_founder_all on public.provider_accounts;
create policy provider_accounts_founder_all on public.provider_accounts
  for all using (founder_id = auth.uid()) with check (founder_id = auth.uid());

drop policy if exists provider_quota_events_founder_all on public.provider_quota_events;
create policy provider_quota_events_founder_all on public.provider_quota_events
  for all using (founder_id = auth.uid()) with check (founder_id = auth.uid());

grant all on public.provider_accounts     to authenticated, service_role;
grant all on public.provider_quota_events to authenticated, service_role;
