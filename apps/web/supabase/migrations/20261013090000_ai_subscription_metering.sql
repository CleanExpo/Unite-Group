-- UNI-2780 — AI subscription metering (steps 1-2). FOUNDER-GATED.
--
-- Meters every AI subscription/provider the founder pays for — 2x Claude Max,
-- ChatGPT Pro, MiniMax API, 2x Cursor, Grok/xAI, OpenRouter, Higgsfield, HeyGen,
-- Artlist, other — WITHOUT routing work across subscriptions. Safety invariant:
-- a provider_accounts row with billing_kind = 'subscription' is structurally
-- unroutable (CHECK below), and Claude Max / ChatGPT Pro rows can only be
-- subscriptions. The two Claude Max seats are separate rows, metered separately
-- (ai_usage_logs.provider_account_id), and never rotated between.
--
-- Additive + idempotent only: CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT
-- EXISTS, DROP CONSTRAINT IF EXISTS then ADD. No table, column or row removed.
--
-- NOT VALIDATED AGAINST A DATABASE. Must run on a Supabase database branch
-- before prod (lksfwktwtmyznckodsau), and prod apply needs founder approval.
-- Never apply autonomously.
--
-- Live-schema assumptions (prod read 13/10/2026 by the coordinator, not by this
-- author): ai_usage_logs exists, has NO CHECK constraints, and its only
-- NOT NULL-without-default columns are provider and model_id.

-- ── 1. provider_accounts: widened provider set + billing metadata ──────────

-- The original inline CHECK's name is [UNCONFIRMED] on prod (Postgres default
-- would be provider_accounts_provider_check). Drop whichever CHECK constrains
-- the provider column, by definition rather than by name, then re-add it named.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.provider_accounts'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\mprovider\M\s*(=|in\M)'
  loop
    execute format('alter table public.provider_accounts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.provider_accounts
  add constraint provider_accounts_provider_check check (provider in (
    'claude', 'openai', 'minimax', 'gemini', 'openrouter',
    'claude_max', 'chatgpt_pro', 'cursor', 'xai', 'higgsfield', 'heygen', 'artlist', 'other'
  ));

alter table public.provider_accounts add column if not exists billing_kind text not null default 'metered';
alter table public.provider_accounts add column if not exists plan_price_aud numeric(10,2);
alter table public.provider_accounts add column if not exists renewal_date date;
alter table public.provider_accounts add column if not exists quota_unit text;
alter table public.provider_accounts add column if not exists quota_limit numeric;
alter table public.provider_accounts add column if not exists routable boolean not null default true;

alter table public.provider_accounts drop constraint if exists provider_accounts_billing_kind_check;
alter table public.provider_accounts
  add constraint provider_accounts_billing_kind_check check (billing_kind in ('metered', 'subscription', 'prepaid'));

alter table public.provider_accounts drop constraint if exists provider_accounts_plan_price_aud_check;
alter table public.provider_accounts
  add constraint provider_accounts_plan_price_aud_check check (plan_price_aud is null or plan_price_aud >= 0);

-- Quota unit set FLAGGED for founder confirmation (mirrors QUOTA_UNITS in
-- src/lib/provider-pool/accounts.ts).
alter table public.provider_accounts drop constraint if exists provider_accounts_quota_unit_check;
alter table public.provider_accounts
  add constraint provider_accounts_quota_unit_check check (quota_unit is null or quota_unit in (
    'tokens', 'requests', 'messages', 'credits', 'minutes', 'generations', 'usd'
  ));

alter table public.provider_accounts drop constraint if exists provider_accounts_quota_limit_check;
alter table public.provider_accounts
  add constraint provider_accounts_quota_limit_check check (quota_limit is null or quota_limit >= 0);

-- THE invariant: a subscription is metered, never routed.
alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_unroutable;
alter table public.provider_accounts
  add constraint provider_accounts_subscription_unroutable check (billing_kind <> 'subscription' or routable = false);

-- Consumer subscriptions whose terms forbid pooling can only be subscriptions.
alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_only_providers;
alter table public.provider_accounts
  add constraint provider_accounts_subscription_only_providers
  check (provider not in ('claude_max', 'chatgpt_pro') or billing_kind = 'subscription');

-- ── 2. ai_usage_logs: codify the live table, then extend it ────────────────

-- No active migration creates this table (archive only:
-- supabase/migrations-archive/_archive/046_ai_usage_tracking*.sql). On prod this
-- is a no-op. On a fresh branch it builds the shape below, derived from the
-- archive + the columns src/lib/ai/usage-recorder.ts inserts.
-- Deliberate departures from the archive, to match the live facts above:
--   * no CHECK constraints (live has none; the archive's provider CHECK would
--     reject the recorder's 'anthropic' value);
--   * workspace_id NULLABLE (recorder omits it; it is a retired tenancy column);
--   * no FK to public.workspaces / auth.users.
-- [UNCONFIRMED] vs live: column types/defaults for tokens_thinking,
-- response_size_bytes, error_message, error_code, endpoint, user_id; whether
-- the live workspace_id/user_id FKs still exist; numeric precision of
-- cost_usd (archive DECIMAL(10,6)) and cost_per_*_mtok (archive DECIMAL(10,2)).
create table if not exists public.ai_usage_logs (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid,
  user_id              uuid,
  provider             text not null,
  model_id             text not null,
  task_type            text,
  tokens_input         integer not null default 0,
  tokens_output        integer not null default 0,
  tokens_thinking      integer default 0,
  tokens_cached        integer default 0,
  cost_usd             numeric(10,6) not null default 0,
  cost_per_input_mtok  numeric(10,2),
  cost_per_output_mtok numeric(10,2),
  latency_ms           integer,
  response_size_bytes  integer,
  success              boolean not null default true,
  error_message        text,
  error_code           text,
  endpoint             text,
  request_id           text,
  metadata             jsonb default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- New metering columns — all NULLABLE so every existing row and every existing
-- writer (which omits them) stays valid.
-- [UNCONFIRMED] that prod has no pre-existing columns with these names; ADD
-- COLUMN IF NOT EXISTS would silently keep a differently-typed one.
alter table public.ai_usage_logs add column if not exists founder_id uuid;
alter table public.ai_usage_logs
  add column if not exists provider_account_id uuid references public.provider_accounts(id) on delete set null;
alter table public.ai_usage_logs add column if not exists source text;
alter table public.ai_usage_logs add column if not exists project text;

alter table public.ai_usage_logs drop constraint if exists ai_usage_logs_source_check;
alter table public.ai_usage_logs
  add constraint ai_usage_logs_source_check check (source is null or source in ('sdk', 'cli_claude', 'cli_codex', 'cli_cursor', 'swarm', 'manual'));

-- Dedupe at-least-once ingest per source. Existing rows have source NULL, and
-- NULLs are distinct in a unique index, so historical rows cannot collide.
create unique index if not exists ai_usage_logs_source_request_id_uidx
  on public.ai_usage_logs (source, request_id) where request_id is not null;

create index if not exists ai_usage_logs_founder_created_idx on public.ai_usage_logs (founder_id, created_at desc);
create index if not exists ai_usage_logs_provider_account_idx on public.ai_usage_logs (provider_account_id);

-- RLS consistent with provider_accounts: founder-scoped by auth.uid(). Reads
-- only — writes stay on the service role (the recorder uses the service
-- client). Pre-existing live policies are left untouched.
alter table public.ai_usage_logs enable row level security;

drop policy if exists ai_usage_logs_founder_select on public.ai_usage_logs;
create policy ai_usage_logs_founder_select on public.ai_usage_logs
  for select using (founder_id = auth.uid());

grant select on public.ai_usage_logs to authenticated;
grant all on public.ai_usage_logs to service_role;

-- ── 3. cost_source seed ─────────────────────────────────────────────────────
-- reachability 'key-gate': plan fees are entered from invoices/receipts, not
-- pulled with a connected token. [UNCONFIRMED] prod cost_source.reachability
-- CHECK still allows 'key-gate' (repo migration 20260714000000 does).
insert into public.cost_source (id, name, reachability, native_currency) values
  ('ai_subscriptions', 'AI subscriptions', 'key-gate', 'AUD')
on conflict (id) do nothing;

-- ── ROLLBACK (manual; run only with founder approval) ───────────────────────
-- Run as one transaction. Restoring the original provider CHECK FAILS if any
-- row now uses a widened provider value — delete/migrate those rows first
-- (a founder decision; they are real subscription records).
--
-- begin;
-- delete from public.cost_source where id = 'ai_subscriptions'
--   and not exists (select 1 from public.cost_record where cost_source_id = 'ai_subscriptions')
--   and not exists (select 1 from public.raw_cost_event where cost_source_id = 'ai_subscriptions');
-- drop policy if exists ai_usage_logs_founder_select on public.ai_usage_logs;
-- drop index if exists public.ai_usage_logs_provider_account_idx;
-- drop index if exists public.ai_usage_logs_founder_created_idx;
-- drop index if exists public.ai_usage_logs_source_request_id_uidx;
-- alter table public.ai_usage_logs drop constraint if exists ai_usage_logs_source_check;
-- alter table public.ai_usage_logs drop column if exists project;
-- alter table public.ai_usage_logs drop column if exists source;
-- alter table public.ai_usage_logs drop column if exists provider_account_id;
-- alter table public.ai_usage_logs drop column if exists founder_id;
-- -- (ai_usage_logs itself is NOT dropped: it predates this migration on prod.)
-- alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_only_providers;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_unroutable;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_quota_limit_check;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_quota_unit_check;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_plan_price_aud_check;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_billing_kind_check;
-- alter table public.provider_accounts drop column if exists routable;
-- alter table public.provider_accounts drop column if exists quota_limit;
-- alter table public.provider_accounts drop column if exists quota_unit;
-- alter table public.provider_accounts drop column if exists renewal_date;
-- alter table public.provider_accounts drop column if exists plan_price_aud;
-- alter table public.provider_accounts drop column if exists billing_kind;
-- alter table public.provider_accounts drop constraint if exists provider_accounts_provider_check;
-- alter table public.provider_accounts add constraint provider_accounts_provider_check
--   check (provider in ('claude', 'openai', 'minimax', 'gemini', 'openrouter'));
-- commit;
