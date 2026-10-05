-- =============================================================================
-- Migration: drip_suppressions — per-founder email suppression list (UNI-2291)
-- FOUNDER-GATED. NOT APPLIED ANYWHERE. Validate on a Supabase database branch
-- before production, per the repo DB rule.
--
-- A row here means "never send drip email to this address for this founder".
-- Written server-side by the public /api/drip/unsubscribe route (service-role
-- client, which bypasses RLS by design) after it verifies a signed token. The
-- drip processor reads it before every live send; a failed read blocks the
-- send (fail closed), so until this migration is applied no live drip send
-- can happen.
--
-- Emails are stored trimmed + lower-cased (enforced by CHECK) so the unique
-- constraint cannot be defeated by case or whitespace variants.
--
-- Founder-only RLS policies mirror 20260713191051_site_keys.sql.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.drip_suppressions;
-- =============================================================================

create table if not exists public.drip_suppressions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email <> ''),
  reason text not null default 'unsubscribed',
  source text not null,
  created_at timestamptz not null default now(),
  constraint drip_suppressions_founder_email_key unique (founder_id, email)
);

create index if not exists drip_suppressions_founder_id_idx
  on public.drip_suppressions (founder_id);

alter table public.drip_suppressions enable row level security;
alter table public.drip_suppressions force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'drip_suppressions'
      and policyname = 'drip_suppressions_founder_select'
  ) then
    create policy drip_suppressions_founder_select
      on public.drip_suppressions
      for select
      using (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'drip_suppressions'
      and policyname = 'drip_suppressions_founder_insert'
  ) then
    create policy drip_suppressions_founder_insert
      on public.drip_suppressions
      for insert
      with check (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'drip_suppressions'
      and policyname = 'drip_suppressions_founder_update'
  ) then
    create policy drip_suppressions_founder_update
      on public.drip_suppressions
      for update
      using (founder_id = auth.uid())
      with check (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'drip_suppressions'
      and policyname = 'drip_suppressions_founder_delete'
  ) then
    create policy drip_suppressions_founder_delete
      on public.drip_suppressions
      for delete
      using (founder_id = auth.uid());
  end if;
end $$;
