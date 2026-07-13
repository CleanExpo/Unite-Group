-- =============================================================================
-- Migration: site_keys — publishable keys for the public site chat agent (UNI-2359)
-- PENDING SANDBOX VERIFICATION — apply via sandbox-wizard.sh before production.
--
-- A site key authorises an embedded widget (public, unauthenticated traffic) to
-- talk to /api/agent on behalf of ONE founder + business. Keys are generated
-- app-side with the `sk_site_` prefix (never in SQL). Public route validation
-- happens through the service-role client (bypasses RLS by design); the
-- founder-only RLS policies below govern dashboard CRUD, mirroring
-- 20260612020000_crm_leads.sql.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.site_keys;
-- =============================================================================

create table if not exists public.site_keys (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  business_key text not null,
  publishable_key text not null unique,
  allowed_origins text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_keys_publishable_key_idx on public.site_keys (publishable_key);
create index if not exists site_keys_founder_id_idx on public.site_keys (founder_id);

alter table public.site_keys enable row level security;
alter table public.site_keys force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_keys'
      and policyname = 'site_keys_founder_select'
  ) then
    create policy site_keys_founder_select
      on public.site_keys
      for select
      using (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_keys'
      and policyname = 'site_keys_founder_insert'
  ) then
    create policy site_keys_founder_insert
      on public.site_keys
      for insert
      with check (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_keys'
      and policyname = 'site_keys_founder_update'
  ) then
    create policy site_keys_founder_update
      on public.site_keys
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
      and tablename = 'site_keys'
      and policyname = 'site_keys_founder_delete'
  ) then
    create policy site_keys_founder_delete
      on public.site_keys
      for delete
      using (founder_id = auth.uid());
  end if;
end $$;
