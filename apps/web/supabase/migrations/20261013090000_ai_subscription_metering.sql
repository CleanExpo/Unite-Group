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
-- Live schema reconciled against a read-only prod query by the orchestrator,
-- 13/10/2026 (lksfwktwtmyznckodsau): ai_usage_logs exists with the exact shape
-- codified in section 2, no CHECK constraints, no workspace FK, user_id FK to
-- auth.users ON DELETE SET NULL, RLS enabled (not forced), and none of
-- founder_id / provider_account_id / source / project yet. provider_accounts'
-- provider CHECK is named provider_accounts_provider_check. cost_source's
-- reachability CHECK allows 'key-gate'.

-- ── 0. lock safety ──────────────────────────────────────────────────────────
-- Bound every lock wait and statement: if a lock cannot be taken quickly the
-- apply FAILS (retry in a quiet window) instead of queueing behind - and then
-- blocking - live readers/writers. CHECKs are added NOT VALID (brief
-- ACCESS EXCLUSIVE, no scan) and validated separately (SHARE UPDATE EXCLUSIVE:
-- reads and writes continue). Indexes use ordinary CREATE INDEX on purpose:
-- prod row counts read 13/10/2026 are ai_usage_logs = 707 and provider_accounts
-- = a handful, so each build takes milliseconds; CONCURRENTLY would force a
-- separate non-transactional migration for no practical gain. Revisit if
-- ai_usage_logs grows past ~1M rows before apply. If the migration runner wraps
-- this file in ONE transaction, each ADD's ACCESS EXCLUSIVE lock is held until
-- commit, so the NOT VALID split only shortens lock time when statements commit
-- separately; at these row counts each validation scan is milliseconds anyway.
set lock_timeout = '5s';
set statement_timeout = '60s';

-- ── 1. provider_accounts: widened provider set + billing metadata ──────────

-- Drop the live CHECK by its real name, then (cheap fallback for any
-- environment where it was created under another name) any other CHECK whose
-- definition constrains the provider column; then re-add it named.
alter table public.provider_accounts drop constraint if exists provider_accounts_provider_check;
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
  )) not valid;
alter table public.provider_accounts validate constraint provider_accounts_provider_check;

alter table public.provider_accounts add column if not exists billing_kind text not null default 'metered';
alter table public.provider_accounts add column if not exists plan_price_aud numeric(10,2);
alter table public.provider_accounts add column if not exists renewal_date date;
alter table public.provider_accounts add column if not exists quota_unit text;
alter table public.provider_accounts add column if not exists quota_limit numeric;
alter table public.provider_accounts add column if not exists routable boolean not null default true;

-- Drift guard: ADD COLUMN IF NOT EXISTS does not repair a pre-existing column.
-- A NULL billing_kind/routable would slip past the subscription CHECKs below
-- (SQL UNKNOWN passes a CHECK), so backfill — only ever in the SAFE direction —
-- then force the defaults and NOT NULL. On prod (neither column exists yet)
-- the updates match no rows and the ALTERs restate what ADD COLUMN set.
update public.provider_accounts
  set billing_kind = case when provider in ('claude_max', 'chatgpt_pro') then 'subscription' else 'metered' end
  where billing_kind is null;
update public.provider_accounts
  set routable = false
  where billing_kind = 'subscription' and routable is distinct from false;
update public.provider_accounts set routable = true where routable is null;
alter table public.provider_accounts alter column billing_kind set default 'metered';
alter table public.provider_accounts alter column billing_kind set not null;
alter table public.provider_accounts alter column routable set default true;
alter table public.provider_accounts alter column routable set not null;

alter table public.provider_accounts drop constraint if exists provider_accounts_billing_kind_check;
alter table public.provider_accounts
  add constraint provider_accounts_billing_kind_check check (billing_kind in ('metered', 'subscription', 'prepaid')) not valid;
alter table public.provider_accounts validate constraint provider_accounts_billing_kind_check;

alter table public.provider_accounts drop constraint if exists provider_accounts_plan_price_aud_check;
alter table public.provider_accounts
  add constraint provider_accounts_plan_price_aud_check check (plan_price_aud is null or plan_price_aud >= 0) not valid;
alter table public.provider_accounts validate constraint provider_accounts_plan_price_aud_check;

-- Quota unit set FLAGGED for founder confirmation (mirrors QUOTA_UNITS in
-- src/lib/provider-pool/accounts.ts).
alter table public.provider_accounts drop constraint if exists provider_accounts_quota_unit_check;
alter table public.provider_accounts
  add constraint provider_accounts_quota_unit_check check (quota_unit is null or quota_unit in (
    'tokens', 'requests', 'messages', 'credits', 'minutes', 'generations', 'usd'
  )) not valid;
alter table public.provider_accounts validate constraint provider_accounts_quota_unit_check;

alter table public.provider_accounts drop constraint if exists provider_accounts_quota_limit_check;
alter table public.provider_accounts
  add constraint provider_accounts_quota_limit_check check (quota_limit is null or quota_limit >= 0) not valid;
alter table public.provider_accounts validate constraint provider_accounts_quota_limit_check;

-- THE invariant: a subscription is metered, never routed.
alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_unroutable;
alter table public.provider_accounts
  add constraint provider_accounts_subscription_unroutable check (billing_kind <> 'subscription' or routable = false) not valid;
alter table public.provider_accounts validate constraint provider_accounts_subscription_unroutable;

-- Consumer subscriptions whose terms forbid pooling can only be subscriptions.
alter table public.provider_accounts drop constraint if exists provider_accounts_subscription_only_providers;
alter table public.provider_accounts
  add constraint provider_accounts_subscription_only_providers
  check (provider not in ('claude_max', 'chatgpt_pro') or billing_kind = 'subscription') not valid;
alter table public.provider_accounts validate constraint provider_accounts_subscription_only_providers;

-- ── 2. ai_usage_logs: codify the live table, then extend it ────────────────

-- No active migration creates this table (archive only:
-- supabase/migrations-archive/_archive/046_ai_usage_tracking*.sql). The body
-- below matches the live prod table column-for-column (types, nullability,
-- defaults, PK, user_id FK; no CHECKs, no workspace FK), so on prod this is a
-- true no-op and on a fresh branch it reproduces prod.
create table if not exists public.ai_usage_logs (
  id                   uuid constraint ai_usage_logs_pkey primary key default gen_random_uuid(),
  workspace_id         uuid,
  user_id              uuid constraint ai_usage_logs_user_id_fkey references auth.users(id) on delete set null,
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
  created_at           timestamptz default now()
);

-- New metering columns — all NULLABLE so every existing row and every existing
-- writer (which omits them) stays valid. None exist on prod yet (13/10/2026).
alter table public.ai_usage_logs add column if not exists founder_id uuid;
alter table public.ai_usage_logs
  add column if not exists provider_account_id uuid references public.provider_accounts(id) on delete set null;
alter table public.ai_usage_logs add column if not exists source text;
alter table public.ai_usage_logs add column if not exists project text;

alter table public.ai_usage_logs drop constraint if exists ai_usage_logs_source_check;
alter table public.ai_usage_logs
  add constraint ai_usage_logs_source_check check (source is null or source in ('sdk', 'cli_claude', 'cli_codex', 'cli_cursor', 'swarm', 'manual')) not valid;
alter table public.ai_usage_logs validate constraint ai_usage_logs_source_check;

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

-- Founder isolation that survives ANY pre-existing permissive policy: a
-- RESTRICTIVE policy is ANDed with every permissive one, so no broader legacy
-- policy (prod inventory not read) can admit another founder's row. Rows with
-- founder_id NULL become invisible to anon/authenticated; every current reader
-- of ai_usage_logs uses the service role (bypasses RLS), so nothing loses data.
drop policy if exists ai_usage_logs_founder_restrict on public.ai_usage_logs;
create policy ai_usage_logs_founder_restrict on public.ai_usage_logs
  as restrictive for all using (founder_id = auth.uid()) with check (founder_id = auth.uid());

drop policy if exists provider_accounts_founder_restrict on public.provider_accounts;
create policy provider_accounts_founder_restrict on public.provider_accounts
  as restrictive for all using (founder_id = auth.uid()) with check (founder_id = auth.uid());

-- Grants are intentionally NOT reverted by the rollback: Supabase's default
-- privileges already grant these on public tables, so a REVOKE could strip
-- grants prod had before this migration (prod grant inventory not read).
grant select on public.ai_usage_logs to authenticated;
grant all on public.ai_usage_logs to service_role;

-- ── 3. cost_source seed ─────────────────────────────────────────────────────
-- reachability 'key-gate': plan fees are entered from invoices/receipts, not
-- pulled with a connected token. Allowed by prod's cost_source_reachability_check.
insert into public.cost_source (id, name, reachability, native_currency) values
  ('ai_subscriptions', 'AI subscriptions', 'key-gate', 'AUD')
on conflict (id) do nothing;

reset lock_timeout;
reset statement_timeout;

-- ── ROLLBACK (manual; run only with founder approval) ───────────────────────
-- Run as one transaction. Restoring the original provider CHECK FAILS if any
-- row now uses a widened provider value — delete/migrate those rows first
-- (a founder decision; they are real subscription records).
-- The 'ai_subscriptions' seed is deleted only when nothing references it
-- (cost_record, raw_cost_event, allocation_rule — every FK to cost_source in
-- 20260714000000); a referenced seed is PRESERVED and the rollback still
-- completes. Grants added above are deliberately left in place (see note).
--
-- begin;
-- delete from public.cost_source where id = 'ai_subscriptions'
--   and not exists (select 1 from public.cost_record where cost_source_id = 'ai_subscriptions')
--   and not exists (select 1 from public.raw_cost_event where cost_source_id = 'ai_subscriptions')
--   and not exists (select 1 from public.allocation_rule where cost_source_id = 'ai_subscriptions');
-- drop policy if exists provider_accounts_founder_restrict on public.provider_accounts;
-- drop policy if exists ai_usage_logs_founder_restrict on public.ai_usage_logs;
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
