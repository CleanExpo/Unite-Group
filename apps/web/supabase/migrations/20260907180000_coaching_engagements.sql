-- Coaching Clinic panel — engagements, sessions, extractions.
--
-- Scope: the founder's own coaching practice with trade operators. Clients are
-- NOT stored here — they are referenced from public.crm_contacts, which is the
-- canonical 1887-row contact table (see 20260630000000_crm_unify_contacts_view.sql).
-- This schema owns the coaching relationship, not the person.
--
-- client_id is carried on every table from day one. Today every policy is
-- founder-only; if a coachee is ever given read access, that becomes an
-- ADDITIVE policy rather than a schema rewrite.

-- ---------------------------------------------------------------------------
-- 1. Engagements — one per coaching client
-- ---------------------------------------------------------------------------
-- Every coaching association carries founder_id. These composite keys prevent
-- a UUID copied from another founder's row from satisfying a child reference.
create unique index if not exists crm_contacts_id_founder_key
  on public.crm_contacts(id, founder_id);

create table if not exists public.coaching_engagements (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id),
  client_id uuid not null,

  -- Denormalised for the sidebar flyout, which sorts by business name and must
  -- not join on every render. Refreshed when the engagement is saved.
  business_name text not null,
  client_name text not null,

  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),

  -- Consent is a first-class field, not a settings checkbox. Nothing
  -- identifiable is published until consent_given is true, and the record of
  -- WHAT was disclosed is part of the consent, not separate from it.
  consent_given boolean not null default false,
  consent_date date,
  consent_method text check (consent_method in ('written', 'email', 'verbal_recorded', 'in_person_signed')),
  consent_disclosure text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Consent must be complete or absent — never half-recorded.
  constraint coaching_engagements_consent_complete
    check (
      consent_given = false
      or (
        consent_date is not null
        and consent_method is not null
        and nullif(btrim(consent_disclosure), '') is not null
      )
    ),
  constraint coaching_engagements_client_founder_fkey
    foreign key (client_id, founder_id)
    references public.crm_contacts(id, founder_id) on delete restrict
);

alter table public.coaching_engagements enable row level security;

drop policy if exists "founder_only" on public.coaching_engagements;
create policy "founder_only" on public.coaching_engagements
  for all using (founder_id = auth.uid());

create unique index if not exists idx_coaching_engagements_client
  on public.coaching_engagements(founder_id, client_id);
create unique index if not exists coaching_engagements_id_founder_key
  on public.coaching_engagements(id, founder_id);
create index if not exists idx_coaching_engagements_sort
  on public.coaching_engagements(founder_id, business_name, client_name);

-- ---------------------------------------------------------------------------
-- 2. Sessions — one per coaching conversation
-- ---------------------------------------------------------------------------
create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id),
  engagement_id uuid not null,
  client_id uuid not null,

  session_date date not null default current_date,
  session_number integer,
  duration_minutes integer,

  -- 'plaud' arrives via the Zapier instant webhook; 'upload'/'paste' are manual.
  -- 'live' is reserved for phase 2 streaming capture and is not yet produced.
  source text not null default 'paste'
    check (source in ('plaud', 'upload', 'paste', 'live')),
  source_ref text,

  transcript text,
  status text not null default 'captured'
    check (status in ('captured', 'extracting', 'extracted', 'reviewed', 'failed')),
  error_message text,

  -- Cost/eval telemetry, matching the coach_reports convention.
  model text,
  input_tokens integer,
  output_tokens integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coaching_sessions_engagement_founder_fkey
    foreign key (engagement_id, founder_id)
    references public.coaching_engagements(id, founder_id) on delete cascade,
  constraint coaching_sessions_client_founder_fkey
    foreign key (client_id, founder_id)
    references public.crm_contacts(id, founder_id) on delete restrict,
  constraint coaching_sessions_source_ref_nonempty
    check (source_ref is null or nullif(btrim(source_ref), '') is not null),
  constraint coaching_sessions_founder_source_ref_key
    unique (founder_id, source_ref)
);

alter table public.coaching_sessions enable row level security;

drop policy if exists "founder_only" on public.coaching_sessions;
create policy "founder_only" on public.coaching_sessions
  for all using (founder_id = auth.uid());

create index if not exists idx_coaching_sessions_engagement
  on public.coaching_sessions(engagement_id, session_date desc);
create unique index if not exists coaching_sessions_id_founder_key
  on public.coaching_sessions(id, founder_id);

-- ---------------------------------------------------------------------------
-- 3. Extractions — the typed client record
-- ---------------------------------------------------------------------------
-- valid_from / superseded_by is what makes "he wanted X in March, that changed
-- in June" read correctly. A superseded row is never deleted; the history is
-- the point.
create table if not exists public.coaching_extractions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id),
  engagement_id uuid not null,
  session_id uuid not null,
  client_id uuid not null,

  kind text not null check (kind in (
    'want', 'need', 'requirement', 'commitment',
    'metric', 'blocker', 'decision', 'open_question'
  )),
  body text not null,

  -- Commitments only: who owes it and by when.
  owner text check (owner in ('coach', 'client')),
  due_date date,

  -- Metrics only: "$8,500 average job value, per month".
  metric_value text,
  metric_unit text,
  metric_period text,

  -- Grounding. transcript_quote + transcript_offset let the coach click through
  -- to the moment the client actually said it. An extraction without a quote is
  -- an assertion, not evidence.
  transcript_quote text,
  transcript_offset integer,
  confidence numeric(3, 2) check (confidence >= 0 and confidence <= 1),

  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected', 'superseded', 'done')),

  -- The correction log. Populated when the founder edits a proposed value —
  -- this is the eval dataset, captured as a by-product of review.
  original_body text,
  reviewed_at timestamptz,

  valid_from date not null default current_date,
  superseded_by uuid references public.coaching_extractions(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coaching_extractions_engagement_founder_fkey
    foreign key (engagement_id, founder_id)
    references public.coaching_engagements(id, founder_id) on delete cascade,
  constraint coaching_extractions_session_founder_fkey
    foreign key (session_id, founder_id)
    references public.coaching_sessions(id, founder_id) on delete cascade,
  constraint coaching_extractions_client_founder_fkey
    foreign key (client_id, founder_id)
    references public.crm_contacts(id, founder_id) on delete restrict
);

alter table public.coaching_extractions enable row level security;

drop policy if exists "founder_only" on public.coaching_extractions;
create policy "founder_only" on public.coaching_extractions
  for all using (founder_id = auth.uid());

create index if not exists idx_coaching_extractions_engagement
  on public.coaching_extractions(engagement_id, kind, status);
create index if not exists idx_coaching_extractions_session
  on public.coaching_extractions(session_id);
-- The brief's hot path: open commitments, oldest first.
create index if not exists idx_coaching_extractions_open
  on public.coaching_extractions(engagement_id, valid_from)
  where status = 'approved' and superseded_by is null;

-- Re-check consent while holding a share lock on the engagement row. A
-- concurrent consent revocation therefore serialises with session creation:
-- whichever transaction gets the lock first determines the honest outcome.
create or replace function public.enforce_coaching_session_consent()
returns trigger
language plpgsql
as $$
declare
  engagement_consent boolean;
begin
  select consent_given
    into engagement_consent
    from public.coaching_engagements
   where id = new.engagement_id
     and founder_id = new.founder_id
   for share;

  if not found or engagement_consent is not true then
    raise exception 'coaching session requires active consent'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists coaching_sessions_consent on public.coaching_sessions;
create trigger coaching_sessions_consent
  before insert on public.coaching_sessions
  for each row execute function public.enforce_coaching_session_consent();

-- ---------------------------------------------------------------------------
-- updated_at triggers (house convention — update_updated_at_column already exists)
-- ---------------------------------------------------------------------------
drop trigger if exists coaching_engagements_updated_at on public.coaching_engagements;
create trigger coaching_engagements_updated_at
  before update on public.coaching_engagements
  for each row execute function update_updated_at_column();

drop trigger if exists coaching_sessions_updated_at on public.coaching_sessions;
create trigger coaching_sessions_updated_at
  before update on public.coaching_sessions
  for each row execute function update_updated_at_column();

drop trigger if exists coaching_extractions_updated_at on public.coaching_extractions;
create trigger coaching_extractions_updated_at
  before update on public.coaching_extractions
  for each row execute function update_updated_at_column();
