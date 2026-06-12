-- Draft-only CRM contacts/opportunities schema for Margot command spine.
-- Apply to sandbox first via scripts/sandbox-wizard.sh before any production promotion.
-- Opportunities are forecast-only pipeline records: they are not billing truth.
-- No secrets, tokens, payment details, unapproved sensitive PII, or cross-client notes belong in additional_data.

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  first_name text,
  last_name text,
  primary_email text,
  primary_phone text,
  role_title text,
  company_name text,
  linked_lead_id uuid references public.crm_leads(id) on delete set null,
  linked_client_id uuid references public.nexus_clients(id) on delete set null,
  linked_business_id uuid references public.businesses(id) on delete set null,
  source text not null default 'manual_or_unknown',
  source_detail text,
  marketing_consent boolean not null default false,
  consent_source text,
  consent_captured_at timestamptz,
  relationship_owner text not null default 'Margot',
  status text not null default 'lead_only',
  dedupe_email_key text,
  dedupe_domain_key text,
  dedupe_phone_key text,
  dedupe_name_company_key text,
  privacy_scope text not null default 'lead_scoped',
  retention_policy text,
  privacy_notes text,
  last_verified_at timestamptz,
  additional_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_status_check check (
    status in ('active', 'lead_only', 'client_contact', 'nurture', 'do_not_contact', 'archived', 'blocked_review')
  ),
  constraint crm_contacts_privacy_scope_check check (
    privacy_scope in ('lead_scoped', 'client_scoped', 'business_scoped', 'restricted', 'global_crm')
  ),
  constraint crm_contacts_minimum_identity_check check (
    nullif(btrim(display_name), '') is not null
      or nullif(btrim(first_name), '') is not null
      or nullif(btrim(last_name), '') is not null
      or nullif(btrim(primary_email), '') is not null
  )
);

create index if not exists crm_contacts_primary_email_idx on public.crm_contacts (lower(primary_email));
create index if not exists crm_contacts_dedupe_email_key_idx on public.crm_contacts (dedupe_email_key);
create index if not exists crm_contacts_linked_lead_id_idx on public.crm_contacts (linked_lead_id);
create index if not exists crm_contacts_linked_client_id_idx on public.crm_contacts (linked_client_id);
create index if not exists crm_contacts_linked_business_id_idx on public.crm_contacts (linked_business_id);
create index if not exists crm_contacts_status_idx on public.crm_contacts (status);
create index if not exists crm_contacts_relationship_owner_idx on public.crm_contacts (relationship_owner);
create index if not exists crm_contacts_privacy_scope_idx on public.crm_contacts (privacy_scope);

alter table public.crm_contacts enable row level security;

-- Reads and writes must go through server routes/service-role code until roles,
-- privacy scopes, and cross-client RLS rules are explicitly approved.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_contacts'
      and policyname = 'crm_contacts_service_role_all'
  ) then
    create policy crm_contacts_service_role_all
      on public.crm_contacts
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null default 'new_signal',
  status text not null default 'open',
  value_amount numeric,
  value_currency text,
  probability integer,
  expected_close_at timestamptz,
  source text not null default 'manual',
  owner text not null default 'Margot',
  linked_lead_id uuid references public.crm_leads(id) on delete set null,
  linked_contact_id uuid references public.crm_contacts(id) on delete set null,
  linked_client_id uuid references public.nexus_clients(id) on delete set null,
  linked_business_id uuid references public.businesses(id) on delete set null,
  next_action text,
  next_action_due_at timestamptz,
  decision_needed text,
  risk text,
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  source_detail text,
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  approval_required boolean not null default false,
  approval_status text not null default 'not_required',
  additional_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_opportunities_stage_check check (
    stage in (
      'new_signal',
      'qualified',
      'discovery',
      'proposal_needed',
      'proposal_sent',
      'negotiation',
      'decision_needed',
      'won_pending_client_conversion',
      'won_converted',
      'lost',
      'paused',
      'blocked_review'
    )
  ),
  constraint crm_opportunities_status_check check (
    status in ('open', 'won', 'lost', 'paused', 'blocked_review', 'cancelled')
  ),
  constraint crm_opportunities_probability_check check (
    probability is null or (probability >= 0 and probability <= 100)
  ),
  constraint crm_opportunities_approval_status_check check (
    approval_status in ('not_required', 'requested', 'approved', 'rejected', 'expired')
  ),
  constraint crm_opportunities_value_amount_check check (
    value_amount is null or value_amount >= 0
  )
);

create index if not exists crm_opportunities_stage_idx on public.crm_opportunities (stage);
create index if not exists crm_opportunities_status_idx on public.crm_opportunities (status);
create index if not exists crm_opportunities_owner_idx on public.crm_opportunities (owner);
create index if not exists crm_opportunities_linked_lead_id_idx on public.crm_opportunities (linked_lead_id);
create index if not exists crm_opportunities_linked_contact_id_idx on public.crm_opportunities (linked_contact_id);
create index if not exists crm_opportunities_linked_client_id_idx on public.crm_opportunities (linked_client_id);
create index if not exists crm_opportunities_linked_business_id_idx on public.crm_opportunities (linked_business_id);
create index if not exists crm_opportunities_next_action_due_at_idx on public.crm_opportunities (next_action_due_at);
create index if not exists crm_opportunities_expected_close_at_idx on public.crm_opportunities (expected_close_at);

alter table public.crm_opportunities enable row level security;

-- Commercial pipeline data is sensitive and not billing truth. Server routes
-- should enforce approvals before client mutations, external comms, billing,
-- or production writes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_opportunities'
      and policyname = 'crm_opportunities_service_role_all'
  ) then
    create policy crm_opportunities_service_role_all
      on public.crm_opportunities
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
