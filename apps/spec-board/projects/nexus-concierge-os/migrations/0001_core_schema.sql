-- ============================================================================
-- Nexus Concierge OS — CORE SCHEMA TEMPLATE (UNI-2170 Phase 1)
--
-- The nine core tables every vertical instantiates. This is a TEMPLATE, not a
-- live migration: each vertical copies it into ITS OWN Supabase project / data
-- plane (Lodgey AU-Sydney, RestoreAssist Unite-Hub, …) and applies it on a
-- Supabase DATABASE BRANCH first. The OS is shared spec + schema, NOT one
-- shared database (core spec §2). No vertical is wired here.
--
-- Contract source: apps/spec-board/projects/nexus-concierge-os/spec.md §6.
-- Columns below are the MINIMUM contract — a vertical MAY add columns (see the
-- lodgey-pack / restoreassist-pack §6a "pack-added columns"); it must NOT change
-- or remove a core column, or the pack has diverged from core.
--
-- LOAD-BEARING INVARIANTS (structural, enforced here — do not weaken):
--   * never-close      : case.next_action_at + srt.next_action_at are NOT NULL.
--                        A case/SRT cannot exist without a dated next action, so
--                        nothing can go dark. Terminal close is explicit only
--                        (case.closed_at set deliberately).
--   * PII-free handoff : handoff.carries_pii is CHECK (= false). Provider routing
--                        is by opaque_token only; a vertical that must deliver an
--                        address (e.g. RestoreAssist) releases it POST-ACCEPT from
--                        its own plane keyed by the token — never in this row.
--                        (restoreassist-pack §7.)
--   * no TFN / gov ID  : no column here stores a TFN or government ID, in any
--                        vertical. Schema absence is guard (a); the free-text
--                        PII interceptor (b) and CI grep (c) are per-vertical.
--   * disclosed refs   : referral_ledger.disclosed is recorded on every row;
--                        gating "disclose before match shown" is app-level.
--
-- SAFETY: idempotent (create … if not exists); single transaction; RLS ENABLED
-- with NO policy (deny-all by default) so a vertical MUST add its own isolation
-- policies (per client_slug / per professional_id) before any client access.
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- ── 1/9  vertical_pack — the registry manifest (root; everything scopes to it) ─
-- One row per vertical instance. domain_map/kb_ref/panel_ref/regime/data_plane
-- describe how the vertical plugs into the core.
create table if not exists vertical_pack (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  domain_map  jsonb not null default '{}'::jsonb,
  kb_ref      text,
  panel_ref   text,
  regime      text,
  data_plane  text,
  created_at  timestamptz not null default now()
);

-- ── 2/9  provider — vetted panel member (generalises Lodgey `professionals`) ───
-- verified_at freshness is load-bearing for verticals that gate dispatch on it
-- (RestoreAssist G4-DISPATCH). credential_ref points at the vetting record in
-- the vertical's own plane (no ID/credential blob stored here).
create table if not exists provider (
  id               uuid primary key default gen_random_uuid(),
  vertical_pack_id uuid not null references vertical_pack (id) on delete cascade,
  credential_ref   text,
  verified_at      timestamptz,
  active           boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ── 3/9  case — the universal container ───────────────────────────────────────
-- never-close: next_action_at NOT NULL. closed_at stays NULL until an explicit,
-- deliberate close. A case is never closed by absence of activity.
create table if not exists "case" (
  id               uuid primary key default gen_random_uuid(),
  vertical_pack_id uuid not null references vertical_pack (id) on delete cascade,
  state            text not null default 'intake'
                     check (state in ('intake','open','action_dated',
                                      'awaiting_provider','provider_returned',
                                      'rolled_forward','closed')),
  opened_at        timestamptz not null default now(),
  next_action_at   timestamptz not null,
  closed_at        timestamptz,
  created_at       timestamptz not null default now()
);

-- ── 4/9  srt — Summary / Recommendation / Timeline (append-only, TFN/ID-free) ──
-- REUSED from Lodgey verbatim in meaning (core spec §"SRT schema — REUSED").
-- never-close: next_action_at NOT NULL. A handed-off SRT demands a return-SRT.
create table if not exists srt (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references "case" (id) on delete cascade,
  summary        jsonb not null default '{}'::jsonb,
  recommendation text,
  timeline       jsonb not null default '[]'::jsonb,
  state          text not null default 'open'
                   check (state in ('open','action_dated',
                                    'srt_returned','rolled_forward')),
  next_action_at timestamptz not null,
  created_at     timestamptz not null default now()
);

-- ── 5/9  srt_return — the bidirectional return-SRT obligation ──────────────────
create table if not exists srt_return (
  id          uuid primary key default gen_random_uuid(),
  srt_id      uuid not null references srt (id) on delete cascade,
  provider_id uuid references provider (id) on delete set null,
  body        jsonb not null default '{}'::jsonb,
  returned_at timestamptz not null default now()
);

-- ── 6/9  consent — consent grants + scope + regime ────────────────────────────
create table if not exists consent (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references "case" (id) on delete cascade,
  scope      text not null,
  regime     text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ── 7/9  handoff — PII-free routing token ─────────────────────────────────────
-- carries_pii is CHECK (= false): a handoff row structurally cannot carry PII.
create table if not exists handoff (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references "case" (id) on delete cascade,
  provider_id  uuid not null references provider (id) on delete cascade,
  opaque_token text not null unique,
  carries_pii  boolean not null default false check (carries_pii = false),
  created_at   timestamptz not null default now()
);

-- ── 8/9  referral_ledger — attribution, disclosed ─────────────────────────────
create table if not exists referral_ledger (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references "case" (id) on delete cascade,
  provider_id uuid references provider (id) on delete set null,
  kind        text not null check (kind in ('referral','revenue','job_value')),
  amount      numeric(14,2),
  disclosed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── 9/9  nudge — the follow-up / never-close loop ─────────────────────────────
create table if not exists nudge (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references "case" (id) on delete cascade,
  due_at     timestamptz not null,
  sent_at    timestamptz,
  channel    text,
  created_at timestamptz not null default now()
);

-- ── Indexes: FK joins + the sweep columns the never-close engine scans ─────────
create index if not exists idx_case_pack           on "case" (vertical_pack_id);
create index if not exists idx_case_next_action    on "case" (next_action_at) where closed_at is null;
create index if not exists idx_provider_pack        on provider (vertical_pack_id);
create index if not exists idx_srt_case             on srt (case_id);
create index if not exists idx_srt_next_action      on srt (next_action_at);
create index if not exists idx_srt_return_srt       on srt_return (srt_id);
create index if not exists idx_consent_case         on consent (case_id);
create index if not exists idx_handoff_case         on handoff (case_id);
create index if not exists idx_referral_case        on referral_ledger (case_id);
create index if not exists idx_nudge_due            on nudge (due_at) where sent_at is null;

-- ── RLS: enabled with NO policy (deny-all). Each vertical MUST add its own ─────
-- isolation policies (per client_slug / per professional_id) before client
-- access. Server-side service-role work bypasses RLS as usual.
alter table vertical_pack   enable row level security;
alter table provider        enable row level security;
alter table "case"          enable row level security;
alter table srt             enable row level security;
alter table srt_return      enable row level security;
alter table consent         enable row level security;
alter table handoff         enable row level security;
alter table referral_ledger enable row level security;
alter table nudge           enable row level security;

commit;
