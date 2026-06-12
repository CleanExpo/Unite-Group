-- 0001_core_identity — the Spine's canonical identity core.
-- Adapts RestoreAssist's clean Party/Org model into a fresh greenfield store.
-- One firm = one core.organization party; one human = one core.person party.
-- PG17 (gen_random_uuid is built-in). Extensions assumed in `extensions`: vector, pg_trgm.
-- Draft v1 — applied + tested-to-GREEN in the build loop; conditions 2 & 4 baked in.

create schema if not exists core;

-- ── Party: the universal identity (person OR organization) ───────────────────
create table core.party (
  party_id        uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('person','organization')),
  display_name    text not null,
  -- golden-record: NULL = this row IS the golden record; else points to survivor.
  golden_party_id uuid references core.party(party_id),
  merged_at       timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index party_golden_idx on core.party(golden_party_id) where golden_party_id is not null;

create table core.person (
  party_id    uuid primary key references core.party(party_id) on delete cascade,
  given_name  text,
  family_name text,
  email       text,
  phone       text
);
create unique index person_email_uidx on core.person (lower(email)) where email is not null;

create table core.organization (
  party_id   uuid primary key references core.party(party_id) on delete cascade,
  legal_name text not null,
  abn        text,                       -- the only deterministic merge key (exists in 1 of 4 sources)
  acn        text,
  state      text,
  logo_url   text
);
create unique index org_abn_uidx on core.organization (abn) where abn is not null;
-- org_id (used by every business module) = core.organization.party_id.

-- ── Identifiers: the dedup keys (abn|acn|email|iicrc|external:<sys>) ──────────
create table core.party_identifier (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references core.party(party_id) on delete cascade,
  scheme      text not null,
  value       text not null,
  created_at  timestamptz not null default now()
);
create unique index party_identifier_uidx on core.party_identifier (scheme, lower(value));
create index party_identifier_party_idx on core.party_identifier(party_id);

-- ── Membership: which people belong to which org (contractor ↔ firm) ─────────
create table core.org_membership (
  id              uuid primary key default gen_random_uuid(),
  person_party_id uuid not null references core.party(party_id) on delete cascade,
  org_party_id    uuid not null references core.party(party_id) on delete cascade,
  role            text not null default 'member',     -- member|owner|staff
  status          text not null default 'active',     -- active|suspended|left
  created_at      timestamptz not null default now(),
  unique (person_party_id, org_party_id)
);
create index org_membership_org_idx on core.org_membership(org_party_id);
create index org_membership_person_idx on core.org_membership(person_party_id);

-- ── Golden-record lineage + audit / human-review queue (conditions 5 & 6) ────
create table core.source_record (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid not null references core.party(party_id) on delete cascade,
  source_system text not null,        -- restoreassist-prod|phills-crm|synthex|unite-group
  source_pk     text not null,
  source_payload jsonb not null default '{}'::jsonb,
  ingested_at   timestamptz not null default now(),
  unique (source_system, source_pk)   -- coverage proof: every source row maps to exactly one party
);

create table core.identity_audit (
  id            uuid primary key default gen_random_uuid(),
  action        text not null,        -- match|merge|split|review_pending|review_resolved
  party_id      uuid references core.party(party_id),
  other_party_id uuid references core.party(party_id),
  confidence    numeric,              -- sub-threshold fuzzy matches land here for HUMAN review (under-merge bias)
  decided_by    text,                 -- 'auto' | operator id ; NULL while pending
  reason        text,
  created_at    timestamptz not null default now()
);
create index identity_audit_pending_idx on core.identity_audit(action) where decided_by is null;

-- ── Tenant + role helpers ────────────────────────────────────────────────────
create or replace function core.current_org_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif((auth.jwt() -> 'app_metadata' ->> 'org_id'), '')::uuid;
$$;

create or replace function core.current_person_id()
returns uuid language sql stable set search_path = '' as $$
  select nullif((auth.jwt() -> 'app_metadata' ->> 'person_id'), '')::uuid;
$$;

create or replace function core.has_org_access(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  -- a member has access to their own org tenant (via active membership), bias to live check
  select exists (
    select 1 from core.org_membership m
    where m.org_party_id = p_org
      and m.person_party_id = (select core.current_person_id())
      and m.status = 'active'
  );
$$;

-- CONDITION 4: internal_staff is a LIVE membership check, never a trusted JWT claim, and FAILS CLOSED.
create or replace function core.is_internal_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.org_membership m
    join core.organization o on o.party_id = m.org_party_id
    where m.person_party_id = (select core.current_person_id())
      and m.status = 'active'
      and m.role = 'staff'
      and o.legal_name = 'Unite-Group'      -- the single operator org; provisioned explicitly
  );
$$;

-- CONDITION 2: identity-table visibility. A person/party is visible to a tenant ONLY via a
-- concrete tie. This function is the single chokepoint; module migrations (leadgen/field/nrpg/
-- carsi) EXTEND it (CREATE OR REPLACE adding their own `or exists(...)` ties) so identity PII
-- never leaks through the shared layer.
create or replace function core.party_visible(p_party uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    core.is_internal_staff()
    -- tie 1: same org (the viewer's org IS this party, or this person is a member of viewer's org)
    or p_party = core.current_org_id()
    or exists (
      select 1 from core.org_membership m
      where m.person_party_id = p_party
        and m.org_party_id = core.current_org_id()
        and m.status = 'active'
    );
  -- module migrations append: routed leads (leadgen), customers/jobs (field), credentials (carsi).
$$;

-- ── RLS: FORCE on every identity table; default-deny, explicit ties only ─────
alter table core.party             enable row level security;
alter table core.party             force  row level security;
alter table core.person            enable row level security;
alter table core.person            force  row level security;
alter table core.organization      enable row level security;
alter table core.organization      force  row level security;
alter table core.party_identifier  enable row level security;
alter table core.party_identifier  force  row level security;
alter table core.org_membership    enable row level security;
alter table core.org_membership    force  row level security;

create policy party_read   on core.party            for select using (core.party_visible(party_id));
create policy person_read  on core.person           for select using (core.party_visible(party_id));
create policy org_read     on core.organization     for select using (core.is_internal_staff() or party_id = core.current_org_id()
                                                                       or exists (select 1 from core.org_membership m
                                                                                  where m.org_party_id = organization.party_id
                                                                                    and m.person_party_id = core.current_person_id()
                                                                                    and m.status = 'active'));
create policy ident_read   on core.party_identifier for select using (core.party_visible(party_id));
create policy member_read  on core.org_membership   for select using (core.is_internal_staff()
                                                                       or org_party_id = core.current_org_id()
                                                                       or person_party_id = core.current_person_id());

-- Writes to identity tables are internal_staff / service-role only in v1 (members don't mint identities).
create policy party_write  on core.party            for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy person_write on core.person           for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy org_write    on core.organization     for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy ident_write  on core.party_identifier for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy member_write on core.org_membership   for all using (core.is_internal_staff()) with check (core.is_internal_staff());

comment on schema core is 'Spine canonical identity (P0). One firm = one organization party; module schemas reference org_id = core.organization.party_id. Reversible: drop schema core cascade.';
