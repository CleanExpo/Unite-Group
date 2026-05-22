-- CRM lead persistence for public marketing intake.
-- Website leads are first-class CRM records; SendGrid is a side integration.

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
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
  matched_client_id uuid references public.nexus_clients(id) on delete set null,
  matched_business_id uuid references public.businesses(id) on delete set null,
  converted_client_id uuid references public.nexus_clients(id) on delete set null,
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

create index if not exists crm_leads_email_idx on public.crm_leads (lower(email));
create index if not exists crm_leads_status_idx on public.crm_leads (status);
create index if not exists crm_leads_captured_at_idx on public.crm_leads (captured_at desc);
create index if not exists crm_leads_assigned_owner_idx on public.crm_leads (assigned_owner);

alter table public.crm_leads enable row level security;

-- Public/API writes must go through service-role server routes. Authenticated reads are
-- intentionally conservative until command-center roles are formalized.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_service_role_all'
  ) then
    create policy crm_leads_service_role_all
      on public.crm_leads
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
