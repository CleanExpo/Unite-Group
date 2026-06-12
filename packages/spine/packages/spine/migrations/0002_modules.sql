-- 0002_modules — the six business modules + Synthex marketing over core identity.
-- Tenant tables carry org_id = core.organization.party_id; FORCE RLS; conditions baked in.
-- vector lives in `public` on the build sandbox; the dedicated spine project installs it in `extensions`.

create schema if not exists marketing;
create table marketing.campaign (
  id uuid primary key default gen_random_uuid(),
  name text not null, channel text, source_code text unique,
  owner text not null default 'synthex', created_at timestamptz not null default now()
);
alter table marketing.campaign enable row level security; alter table marketing.campaign force row level security;
create policy campaign_staff_all on marketing.campaign for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy campaign_read_auth on marketing.campaign for select using (auth.uid() is not null);

create schema if not exists leadgen;
create table leadgen.lead (
  id uuid primary key default gen_random_uuid(),
  contact_person_id uuid references core.party(party_id),
  suburb text, state text, hazard_type text, description text,
  campaign_id uuid references marketing.campaign(id),
  source text, status text not null default 'new', created_at timestamptz not null default now()
);
create table leadgen.lead_routing (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leadgen.lead(id) on delete cascade,
  org_id uuid not null references core.organization(party_id),
  status text not null default 'offered', lead_fee_cents int, assigned_at timestamptz not null default now(),
  unique (lead_id, org_id)
);
create index lead_routing_org_idx on leadgen.lead_routing(org_id);
create index lead_routing_lead_idx on leadgen.lead_routing(lead_id);
alter table leadgen.lead enable row level security; alter table leadgen.lead force row level security;
alter table leadgen.lead_routing enable row level security; alter table leadgen.lead_routing force row level security;
create policy lead_read on leadgen.lead for select using (core.is_internal_staff()
  or exists (select 1 from leadgen.lead_routing r where r.lead_id = lead.id and r.org_id = core.current_org_id()));
create policy lead_staff_write on leadgen.lead for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy routing_read on leadgen.lead_routing for select using (core.is_internal_staff() or org_id = core.current_org_id());
create policy routing_write on leadgen.lead_routing for all using (core.is_internal_staff()) with check (core.is_internal_staff());

create schema if not exists onboarding;
create table onboarding.application (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references core.organization(party_id),
  applicant_person_id uuid references core.party(party_id),
  source_lead_id uuid references leadgen.lead(id),
  campaign_id uuid references marketing.campaign(id),
  status text not null default 'submitted', submitted_at timestamptz not null default now()
);
alter table onboarding.application enable row level security; alter table onboarding.application force row level security;
create policy onboarding_read on onboarding.application for select using (
  core.is_internal_staff() or applicant_person_id = core.current_person_id() or org_id = core.current_org_id());
create policy onboarding_write on onboarding.application for all using (core.is_internal_staff()) with check (core.is_internal_staff());

create schema if not exists nrpg;
create table nrpg.membership (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references core.organization(party_id),
  tier text not null default 'standard', status text not null default 'active', joined_at timestamptz not null default now()
);
create unique index membership_one_active_idx on nrpg.membership(org_id) where status = 'active';
create table nrpg.dues_invoice (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references core.organization(party_id),
  amount_cents int, period text, status text not null default 'due', created_at timestamptz not null default now()
);
alter table nrpg.membership enable row level security; alter table nrpg.membership force row level security;
alter table nrpg.dues_invoice enable row level security; alter table nrpg.dues_invoice force row level security;
create policy membership_read on nrpg.membership for select using (core.is_internal_staff() or org_id = core.current_org_id());
create policy membership_write on nrpg.membership for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy dues_read on nrpg.dues_invoice for select using (core.is_internal_staff() or org_id = core.current_org_id());
create policy dues_write on nrpg.dues_invoice for all using (core.is_internal_staff()) with check (core.is_internal_staff());

create schema if not exists sales;
create table sales.opportunity (
  id uuid primary key default gen_random_uuid(),
  target_org_id uuid references core.organization(party_id),
  stage text not null default 'lead', amount_cents int, owner text not null default 'phill',
  created_at timestamptz not null default now()
);
alter table sales.opportunity enable row level security; alter table sales.opportunity force row level security;
create policy opp_staff_only on sales.opportunity for all using (core.is_internal_staff()) with check (core.is_internal_staff());

create schema if not exists carsi;
create table carsi.course (
  id uuid primary key default gen_random_uuid(),
  title text not null, iicrc_category text, ce_credits numeric,
  embedding public.vector(384), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index course_embedding_hnsw on carsi.course using hnsw (embedding public.vector_cosine_ops);
create table carsi.enrollment (
  id uuid primary key default gen_random_uuid(),
  person_party_id uuid not null references core.party(party_id),
  course_id uuid not null references carsi.course(id),
  org_id uuid references core.organization(party_id),
  status text not null default 'enrolled', enrolled_at timestamptz not null default now(), completed_at timestamptz
);
create table carsi.training_credential (
  id uuid primary key default gen_random_uuid(),
  person_party_id uuid not null references core.party(party_id),
  course_id uuid not null references carsi.course(id),
  iicrc_credits numeric, issued_at timestamptz not null default now(), expires_at timestamptz
);
alter table carsi.course enable row level security; alter table carsi.course force row level security;
alter table carsi.enrollment enable row level security; alter table carsi.enrollment force row level security;
alter table carsi.training_credential enable row level security; alter table carsi.training_credential force row level security;
create policy course_read on carsi.course for select using (auth.uid() is not null);
create policy course_write on carsi.course for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy enroll_read on carsi.enrollment for select using (core.is_internal_staff() or person_party_id = core.current_person_id() or org_id = core.current_org_id());
create policy enroll_write on carsi.enrollment for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy cred_read on carsi.training_credential for select using (core.is_internal_staff() or person_party_id = core.current_person_id()
  or exists (select 1 from core.org_membership m where m.person_party_id = training_credential.person_party_id and m.org_party_id = core.current_org_id() and m.status='active'));
create policy cred_write on carsi.training_credential for all using (core.is_internal_staff()) with check (core.is_internal_staff());

create schema if not exists field;
create table field.customer (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references core.organization(party_id),
  contact_person_id uuid references core.party(party_id),
  name text not null, source_lead_id uuid references leadgen.lead(id), created_at timestamptz not null default now()
);
create table field.job (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references core.organization(party_id),
  customer_id uuid not null references field.customer(id),
  status text not null default 'open', hazard_type text, source_lead_id uuid references leadgen.lead(id),
  created_at timestamptz not null default now()
);
create table field.evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references core.organization(party_id),
  job_id uuid not null references field.job(id) on delete cascade,
  captured_by uuid references core.party(party_id), captured_at timestamptz not null default now(),
  gps_lat numeric, gps_lng numeric, sha256 text, evidence_class text,
  embedding public.vector(384), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index evidence_embedding_hnsw on field.evidence using hnsw (embedding public.vector_cosine_ops);
create index customer_org_idx on field.customer(org_id);
create index job_org_idx on field.job(org_id);
create index evidence_org_idx on field.evidence(org_id);
alter table field.customer enable row level security; alter table field.customer force row level security;
alter table field.job enable row level security; alter table field.job force row level security;
alter table field.evidence enable row level security; alter table field.evidence force row level security;
create policy customer_rw on field.customer for all using (core.is_internal_staff() or org_id = core.current_org_id()) with check (core.is_internal_staff() or org_id = core.current_org_id());
create policy job_rw on field.job for all using (core.is_internal_staff() or org_id = core.current_org_id()) with check (core.is_internal_staff() or org_id = core.current_org_id());
create policy evidence_rw on field.evidence for all using (core.is_internal_staff() or org_id = core.current_org_id()) with check (core.is_internal_staff() or org_id = core.current_org_id());

-- CONDITION 2: extend identity-visibility with module ties (routed leads, customers, evidence).
create or replace function core.party_visible(p_party uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_internal_staff()
    or p_party = core.current_org_id()
    or exists (select 1 from core.org_membership m where m.person_party_id = p_party and m.org_party_id = core.current_org_id() and m.status = 'active')
    or exists (select 1 from leadgen.lead l join leadgen.lead_routing r on r.lead_id = l.id where l.contact_person_id = p_party and r.org_id = core.current_org_id())
    or exists (select 1 from field.customer c where c.contact_person_id = p_party and c.org_id = core.current_org_id())
    or exists (select 1 from field.evidence e where e.captured_by = p_party and e.org_id = core.current_org_id());
$$;
