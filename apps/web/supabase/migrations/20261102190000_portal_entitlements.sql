-- UNI-3167 on a minimal slice of UNI-3141: portal tenant owners and per-tenant module entitlements.
-- Additive only. This file is NOT applied by its PR; applying it goes through a Supabase branch and Phill's approval.
-- Down (manual, reviewed forward migration only):
--   drop table if exists public.portal_entitlements; drop table if exists public.portal_tenant_members;
--   drop function if exists public.portal_session_is_aal2(); drop function if exists public.portal_is_tenant_owner(text);
--
-- Rules this file enforces in the database, not only in app code:
--   * an owner reads only their own tenant's entitlement, and only from a second-factor (aal2) session;
--   * nobody outside service_role (and the invite redeem function in the next migration) writes either table;
--   * growth modules default OFF, and any plan other than 'paid' can never hold a module that is ON.
-- Billing (Stripe) is out of scope: the app exposes a typed StripeModuleSwitch stub only.

create table if not exists public.portal_tenant_members (
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  primary key (tenant_slug, user_id)
);

create index if not exists portal_tenant_members_user_idx on public.portal_tenant_members (user_id);

create table if not exists public.portal_entitlements (
  tenant_slug text primary key check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  plan text not null default 'none' check (plan in ('comp', 'paid', 'none')),
  modules jsonb not null default '{"content": false, "seo": false, "social": false, "voice": false}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_entitlements_modules_shape check (
    jsonb_typeof(modules) = 'object'
    and (modules - array['content', 'seo', 'social', 'voice']) = '{}'::jsonb
    and not jsonb_path_exists(modules, '$.* ? (@.type() != "boolean")')
  ),
  constraint portal_entitlements_unpaid_modules_off check (
    plan = 'paid' or not jsonb_path_exists(modules, '$.* ? (@ == true)')
  )
);

-- True only when the caller's session passed a second factor. aal1 is "go verify", never access.
create or replace function public.portal_session_is_aal2() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- True when the signed-in caller owns the tenant AND the session is aal2.
create or replace function public.portal_is_tenant_owner(p_tenant_slug text) returns boolean
language sql stable set search_path = '' as $$
  select public.portal_session_is_aal2() and exists (
    select 1 from public.portal_tenant_members m
    where m.tenant_slug = p_tenant_slug and m.user_id = auth.uid()
  )
$$;

alter table public.portal_tenant_members enable row level security;
alter table public.portal_tenant_members force row level security;
alter table public.portal_entitlements enable row level security;
alter table public.portal_entitlements force row level security;

revoke all on table public.portal_tenant_members, public.portal_entitlements from public, anon, authenticated;
grant select on table public.portal_tenant_members, public.portal_entitlements to authenticated;
grant select, insert, update, delete on table public.portal_tenant_members, public.portal_entitlements to service_role;

revoke all on function public.portal_session_is_aal2() from public, anon;
revoke all on function public.portal_is_tenant_owner(text) from public, anon;
grant execute on function public.portal_session_is_aal2() to authenticated, service_role;
grant execute on function public.portal_is_tenant_owner(text) to authenticated, service_role;

do $$
begin
  -- A signed-in user may see their own membership row (any aal), so the portal can say
  -- "verify your second factor" instead of "you have no portal". It reveals nothing about other tenants.
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'portal_tenant_members' and policyname = 'portal_tenant_members_self_select'
  ) then
    create policy portal_tenant_members_self_select on public.portal_tenant_members
      for select to authenticated using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'portal_entitlements' and policyname = 'portal_entitlements_owner_aal2_select'
  ) then
    create policy portal_entitlements_owner_aal2_select on public.portal_entitlements
      for select to authenticated using (public.portal_is_tenant_owner(tenant_slug));
  end if;
end $$;
