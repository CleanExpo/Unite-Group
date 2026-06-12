-- =============================================================================
-- Migration: CRM lead persistence for public marketing intake
-- Ported from Authority-Site supabase/migrations/20260523100000_crm_leads.sql, 12/06/2026.
-- PENDING SANDBOX VERIFICATION — apply via sandbox-wizard.sh before production.
--
-- Adaptations from source:
--   - Added founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--     (source used service_role-only RLS with no user scoping; apps/web requires
--      founder_id scoping per docs/migration/unite-group-to-unite-hub-consolidation-plan.md)
--   - Replaced service_role-only RLS with founder_id = auth.uid() policies
--   - Service-role bypass is implicit (service_role bypasses RLS by design)
--
-- Rollback:
--   DROP TABLE IF EXISTS public.crm_leads;
-- =============================================================================

-- CRM lead persistence for public marketing intake.
-- Website leads are first-class CRM records; SendGrid is a side integration.

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  company text,
  job_title text,
  message text,
  interests text,
  referral_source text,
  marketing_consent boolean not null default false,
  email_list_id text,
  source text not null default 'website_form',
  status text not null default 'new',
  qualification_score integer,
  assigned_owner text not null default 'Margot',
  matched_client_id uuid,
  matched_business_id uuid,
  converted_client_id uuid,
  ip_address text,
  user_agent text,
  additional_data jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz,
  constraint crm_leads_status_check check (
    status in ('new', 'qualified', 'nurture', 'converted', 'disqualified', 'spam')
  ),
  constraint crm_leads_qualification_score_check check (
    qualification_score is null or (qualification_score >= 0 and qualification_score <= 100)
  )
);

create index if not exists crm_leads_founder_id_idx on public.crm_leads (founder_id);
create index if not exists crm_leads_email_idx on public.crm_leads (lower(email));
create index if not exists crm_leads_status_idx on public.crm_leads (status);
create index if not exists crm_leads_captured_at_idx on public.crm_leads (captured_at desc);
create index if not exists crm_leads_assigned_owner_idx on public.crm_leads (assigned_owner);

alter table public.crm_leads enable row level security;
alter table public.crm_leads force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_founder_select'
  ) then
    create policy crm_leads_founder_select
      on public.crm_leads
      for select
      using (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_founder_insert'
  ) then
    create policy crm_leads_founder_insert
      on public.crm_leads
      for insert
      with check (founder_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_founder_update'
  ) then
    create policy crm_leads_founder_update
      on public.crm_leads
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
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_founder_delete'
  ) then
    create policy crm_leads_founder_delete
      on public.crm_leads
      for delete
      using (founder_id = auth.uid());
  end if;
end $$;
