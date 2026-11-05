-- FOUNDER-GATED. UNI-3269 (GATES-0): schema `gates` for the own-built marketing release gates
-- (Pulse analytics, Proof A/B tests, Relay social scheduling, Audience Evidence Collector,
-- /api/gates/check). Phill approved these 12 tables and this production migration on
-- 05/11/2026 11:12 AM AEST. Binding blocker for GATES-1..10.
--
-- Additive only. Everything lives in the new schema `gates`. Nothing outside it is created,
-- replaced, altered or dropped; the only outside object referenced is auth.jwt() (read-only).
--
-- Fingerprint check first: if schema `gates`, or any table or function inside it, already
-- exists, the run raises and stops before anything changes (the whole file is one transaction,
-- so a failure at any later step also applies nothing). Re-running this file is therefore an
-- error by design, never a silent overwrite.
--
-- Tenancy: every table carries org_id. A signed-in user reads only rows whose org_id equals
-- the `org_id` claim in their JWT app_metadata. app_metadata is writable only with the service
-- role, so a user cannot pick their own org (user_metadata is user-editable and is never read).
-- No claim, or a claim that is not a uuid, means no rows, not an error. anon gets nothing.
-- authenticated gets SELECT only; every write goes through server code using service_role
-- (collector, crons, admin API routes), which bypasses RLS by design. RLS is also FORCED, so
-- the table owner is held to the same policies.
-- Child rows carry composite (org_id, parent_id) foreign keys, so a row can never point at a
-- parent in another org.
--
-- Not done here, on purpose (follow-ups for GATES-1/2):
--   * PostgREST does not serve `gates` until it is added to the API's exposed schemas
--     (project setting). Until then only direct Postgres connections reach it.
--   * gates.events has monthly partitions for 2026-11 .. 2027-12 plus a DEFAULT partition that
--     catches anything else. Creating later months is the GATES-2 nightly job's duty.
--   * Assigning users an org_id claim is done by whoever provisions access (service role).
--
-- Rollback: supabase/manual-applies/2026-11-05_gates_schema_rollback.sql (drops schema gates
-- and all its data; only safe before GATES-1 starts writing).
-- Proof: scripts/gates-schema-db-proof.sh (throwaway Postgres 15; planted-defect controls).

begin;

set local lock_timeout = '5s';

-- 0. Fingerprint check (runs first, so a refusal changes nothing) ----------------------------
do $$
declare
  v_found text;
begin
  if exists (select 1 from pg_namespace where nspname = 'gates') then
    raise exception 'gates_schema: schema gates already exists; refusing to run, nothing changed';
  end if;

  select string_agg(n.nspname || '.' || c.relname, ', ' order by c.relname) into v_found
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'gates';
  if v_found is not null then
    raise exception 'gates_schema: relation(s) already exist in gates: %; refusing to run, nothing changed', v_found;
  end if;

  select string_agg(n.nspname || '.' || p.proname, ', ' order by p.proname) into v_found
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'gates';
  if v_found is not null then
    raise exception 'gates_schema: function(s) already exist in gates: %; refusing to run, nothing changed', v_found;
  end if;
end
$$;

-- 1. Schema and the org claim helper ---------------------------------------------------------
create schema gates;
revoke all on schema gates from public;
grant usage on schema gates to authenticated, service_role;

-- The caller's org, from the signed app_metadata claim. NULL when absent or not a uuid, so a
-- malformed claim yields no rows instead of an error.
create function gates.jwt_org_id() returns uuid
language sql stable
set search_path = ''
as $$
  select case
    when (auth.jwt() -> 'app_metadata' ->> 'org_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  end
$$;
revoke all on function gates.jwt_org_id() from public;
grant execute on function gates.jwt_org_id() to authenticated, service_role;

-- 2. Tables -----------------------------------------------------------------------------------

-- A brand Unite-Group markets (DR, NRPG, CARSI, Synthex, ...).
create table gates.brands (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, slug)
);

create table gates.campaigns (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  brand_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'done')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  foreign key (org_id, brand_id) references gates.brands (org_id, id),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

-- A tracked website. domain is globally unique: the collector maps an incoming host to one site.
create table gates.sites (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  brand_id uuid not null,
  domain text not null unique check (domain ~ '^[a-z0-9.-]{1,253}$'),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  foreign key (org_id, brand_id) references gates.brands (org_id, id)
);

-- Pulse raw events. No personal data: visitor_hash and session_hash are daily-rotating salted
-- hashes made by the collector; no IP, user agent or cookie is stored.
create table gates.events (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  ts timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 2048),
  referrer text check (char_length(referrer) <= 2048),
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  utm_term text check (char_length(utm_term) <= 200),
  utm_content text check (char_length(utm_content) <= 200),
  country text check (country ~ '^[A-Z]{2}$'),
  device text check (device in ('desktop', 'mobile', 'tablet', 'other')),
  event_name text not null default 'pageview' check (event_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 4096),
  visitor_hash text not null check (char_length(visitor_hash) between 16 and 128),
  session_hash text not null check (char_length(session_hash) between 16 and 128),
  primary key (id, ts),
  foreign key (org_id, site_id) references gates.sites (org_id, id)
) partition by range (ts);

create index events_site_ts_idx on gates.events (site_id, ts);
create index events_org_ts_idx on gates.events (org_id, ts);

-- Nightly rollup of events (GATES-2). path '' = whole site; source '' = all sources.
create table gates.daily_rollup (
  org_id uuid not null,
  site_id uuid not null,
  day date not null,
  path text not null default '',
  source text not null default '',
  pageviews bigint not null default 0 check (pageviews >= 0),
  visitors bigint not null default 0 check (visitors >= 0),
  sessions bigint not null default 0 check (sessions >= 0),
  conversions jsonb not null default '{}'::jsonb check (jsonb_typeof(conversions) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (site_id, day, path, source),
  foreign key (org_id, site_id) references gates.sites (org_id, id)
);

create index daily_rollup_org_day_idx on gates.daily_rollup (org_id, day);

-- Proof experiments (GATES-4). budget_aud above 0 means paid traffic, which needs Phill's GO.
create table gates.experiments (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  campaign_id uuid not null,
  site_id uuid,
  key text not null check (key ~ '^[a-z0-9-]{1,64}$'),
  hypothesis text not null check (char_length(hypothesis) between 1 and 2000),
  metric text not null check (char_length(metric) between 1 and 200),
  variants jsonb not null check (jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) >= 2),
  min_sample integer not null check (min_sample > 0),
  stop_rule text not null check (char_length(stop_rule) between 1 and 2000),
  budget_aud numeric(12, 2) not null default 0 check (budget_aud >= 0),
  status text not null default 'draft' check (status in ('draft', 'running', 'stopped', 'decided')),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, key),
  foreign key (org_id, campaign_id) references gates.campaigns (org_id, id),
  foreign key (org_id, site_id) references gates.sites (org_id, id)
);

create table gates.assignments (
  org_id uuid not null,
  experiment_id uuid not null,
  visitor_hash text not null check (char_length(visitor_hash) between 16 and 128),
  variant text not null check (char_length(variant) between 1 and 64),
  assigned_at timestamptz not null default now(),
  primary key (experiment_id, visitor_hash),
  foreign key (org_id, experiment_id) references gates.experiments (org_id, id)
);

-- Relay social channels. No tokens here: platform credentials live in env/Vault only.
create table gates.channels (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  brand_id uuid not null,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram', 'x', 'youtube')),
  handle text not null check (char_length(handle) between 1 and 200),
  external_id text check (char_length(external_id) <= 200),
  status text not null default 'pending' check (status in ('pending', 'connected', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  unique (org_id, platform, handle),
  foreign key (org_id, brand_id) references gates.brands (org_id, id)
);

-- Gate verdicts (Gate 1 three-second rule, Gate 2 audience evidence, Gate 3 proven engagement).
create table gates.gate_results (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  campaign_id uuid not null,
  gate smallint not null check (gate in (1, 2, 3)),
  verdict text not null check (verdict in ('PASS', 'FAIL')),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  asset_ref text check (char_length(asset_ref) <= 2048),
  checked_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  foreign key (org_id, campaign_id) references gates.campaigns (org_id, id)
);

create index gate_results_campaign_idx on gates.gate_results (campaign_id, checked_at desc);

-- Relay posts. A post cannot be scheduled or published without a gate result and an approver
-- (whether that gate result is a PASS is enforced by GATES-5/9 server code).
create table gates.posts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  campaign_id uuid not null,
  channel_id uuid not null,
  body text not null check (char_length(body) between 1 and 10000),
  link_url text check (link_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'published', 'failed', 'cancelled')),
  gate_result_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text check (char_length(external_post_id) <= 200),
  created_at timestamptz not null default now(),
  primary key (id),
  unique (org_id, id),
  foreign key (org_id, campaign_id) references gates.campaigns (org_id, id),
  foreign key (org_id, channel_id) references gates.channels (org_id, id),
  foreign key (org_id, gate_result_id) references gates.gate_results (org_id, id),
  check (status not in ('approved', 'scheduled', 'published')
         or (gate_result_id is not null and approved_by is not null and approved_at is not null)),
  check (status not in ('scheduled', 'published') or scheduled_at is not null)
);

create index posts_due_idx on gates.posts (status, scheduled_at);

create table gates.post_metrics (
  org_id uuid not null,
  post_id uuid not null,
  captured_at timestamptz not null default now(),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  reactions bigint not null default 0 check (reactions >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  primary key (post_id, captured_at),
  foreign key (org_id, post_id) references gates.posts (org_id, id)
);

create table gates.audience_evidence (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  campaign_id uuid not null,
  kind text not null check (kind in ('crm', 'search', 'test', 'social_voice', 'competitor_ad')),
  metric text not null check (char_length(metric) between 1 and 200),
  value numeric not null,
  source_url text check (source_url ~ '^https?://'),
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (org_id, campaign_id) references gates.campaigns (org_id, id)
);

create index audience_evidence_campaign_idx on gates.audience_evidence (campaign_id, kind);

-- 3. Monthly partitions for gates.events ----------------------------------------------------
create table gates.events_default partition of gates.events default;
create table gates.events_y2026m11 partition of gates.events for values from ('2026-11-01 00:00:00+00') to ('2026-12-01 00:00:00+00');
create table gates.events_y2026m12 partition of gates.events for values from ('2026-12-01 00:00:00+00') to ('2027-01-01 00:00:00+00');
create table gates.events_y2027m01 partition of gates.events for values from ('2027-01-01 00:00:00+00') to ('2027-02-01 00:00:00+00');
create table gates.events_y2027m02 partition of gates.events for values from ('2027-02-01 00:00:00+00') to ('2027-03-01 00:00:00+00');
create table gates.events_y2027m03 partition of gates.events for values from ('2027-03-01 00:00:00+00') to ('2027-04-01 00:00:00+00');
create table gates.events_y2027m04 partition of gates.events for values from ('2027-04-01 00:00:00+00') to ('2027-05-01 00:00:00+00');
create table gates.events_y2027m05 partition of gates.events for values from ('2027-05-01 00:00:00+00') to ('2027-06-01 00:00:00+00');
create table gates.events_y2027m06 partition of gates.events for values from ('2027-06-01 00:00:00+00') to ('2027-07-01 00:00:00+00');
create table gates.events_y2027m07 partition of gates.events for values from ('2027-07-01 00:00:00+00') to ('2027-08-01 00:00:00+00');
create table gates.events_y2027m08 partition of gates.events for values from ('2027-08-01 00:00:00+00') to ('2027-09-01 00:00:00+00');
create table gates.events_y2027m09 partition of gates.events for values from ('2027-09-01 00:00:00+00') to ('2027-10-01 00:00:00+00');
create table gates.events_y2027m10 partition of gates.events for values from ('2027-10-01 00:00:00+00') to ('2027-11-01 00:00:00+00');
create table gates.events_y2027m11 partition of gates.events for values from ('2027-11-01 00:00:00+00') to ('2027-12-01 00:00:00+00');
create table gates.events_y2027m12 partition of gates.events for values from ('2027-12-01 00:00:00+00') to ('2028-01-01 00:00:00+00');

-- 4. Row security, policies and grants on the twelve tables ---------------------------------
alter table gates.brands enable row level security;
alter table gates.brands force row level security;
create policy brands_org_read on gates.brands
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.brands from public, anon, authenticated;

alter table gates.campaigns enable row level security;
alter table gates.campaigns force row level security;
create policy campaigns_org_read on gates.campaigns
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.campaigns from public, anon, authenticated;

alter table gates.sites enable row level security;
alter table gates.sites force row level security;
create policy sites_org_read on gates.sites
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.sites from public, anon, authenticated;

alter table gates.events enable row level security;
alter table gates.events force row level security;
create policy events_org_read on gates.events
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.events from public, anon, authenticated;

alter table gates.daily_rollup enable row level security;
alter table gates.daily_rollup force row level security;
create policy daily_rollup_org_read on gates.daily_rollup
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.daily_rollup from public, anon, authenticated;

alter table gates.experiments enable row level security;
alter table gates.experiments force row level security;
create policy experiments_org_read on gates.experiments
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.experiments from public, anon, authenticated;

alter table gates.assignments enable row level security;
alter table gates.assignments force row level security;
create policy assignments_org_read on gates.assignments
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.assignments from public, anon, authenticated;

alter table gates.channels enable row level security;
alter table gates.channels force row level security;
create policy channels_org_read on gates.channels
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.channels from public, anon, authenticated;

alter table gates.posts enable row level security;
alter table gates.posts force row level security;
create policy posts_org_read on gates.posts
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.posts from public, anon, authenticated;

alter table gates.post_metrics enable row level security;
alter table gates.post_metrics force row level security;
create policy post_metrics_org_read on gates.post_metrics
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.post_metrics from public, anon, authenticated;

alter table gates.audience_evidence enable row level security;
alter table gates.audience_evidence force row level security;
create policy audience_evidence_org_read on gates.audience_evidence
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.audience_evidence from public, anon, authenticated;

alter table gates.gate_results enable row level security;
alter table gates.gate_results force row level security;
create policy gate_results_org_read on gates.gate_results
  for select to authenticated
  using (org_id = gates.jwt_org_id());
revoke all on table gates.gate_results from public, anon, authenticated;

grant select on table
  gates.brands, gates.campaigns, gates.sites, gates.events, gates.daily_rollup, gates.experiments,
  gates.assignments, gates.channels, gates.posts, gates.post_metrics, gates.audience_evidence,
  gates.gate_results
  to authenticated;
grant all on table
  gates.brands, gates.campaigns, gates.sites, gates.events, gates.daily_rollup, gates.experiments,
  gates.assignments, gates.channels, gates.posts, gates.post_metrics, gates.audience_evidence,
  gates.gate_results
  to service_role;

-- Partitions: reached only through gates.events (whose policy applies). Row security on with no
-- policy, and no grant to authenticated, so a direct read of a partition returns nothing.
alter table gates.events_default enable row level security;
alter table gates.events_default force row level security;
alter table gates.events_y2026m11 enable row level security;
alter table gates.events_y2026m11 force row level security;
alter table gates.events_y2026m12 enable row level security;
alter table gates.events_y2026m12 force row level security;
alter table gates.events_y2027m01 enable row level security;
alter table gates.events_y2027m01 force row level security;
alter table gates.events_y2027m02 enable row level security;
alter table gates.events_y2027m02 force row level security;
alter table gates.events_y2027m03 enable row level security;
alter table gates.events_y2027m03 force row level security;
alter table gates.events_y2027m04 enable row level security;
alter table gates.events_y2027m04 force row level security;
alter table gates.events_y2027m05 enable row level security;
alter table gates.events_y2027m05 force row level security;
alter table gates.events_y2027m06 enable row level security;
alter table gates.events_y2027m06 force row level security;
alter table gates.events_y2027m07 enable row level security;
alter table gates.events_y2027m07 force row level security;
alter table gates.events_y2027m08 enable row level security;
alter table gates.events_y2027m08 force row level security;
alter table gates.events_y2027m09 enable row level security;
alter table gates.events_y2027m09 force row level security;
alter table gates.events_y2027m10 enable row level security;
alter table gates.events_y2027m10 force row level security;
alter table gates.events_y2027m11 enable row level security;
alter table gates.events_y2027m11 force row level security;
alter table gates.events_y2027m12 enable row level security;
alter table gates.events_y2027m12 force row level security;
revoke all on table
  gates.events_default, gates.events_y2026m11, gates.events_y2026m12, gates.events_y2027m01,
  gates.events_y2027m02, gates.events_y2027m03, gates.events_y2027m04, gates.events_y2027m05,
  gates.events_y2027m06, gates.events_y2027m07, gates.events_y2027m08, gates.events_y2027m09,
  gates.events_y2027m10, gates.events_y2027m11, gates.events_y2027m12
  from public, anon, authenticated;
grant all on table
  gates.events_default, gates.events_y2026m11, gates.events_y2026m12, gates.events_y2027m01,
  gates.events_y2027m02, gates.events_y2027m03, gates.events_y2027m04, gates.events_y2027m05,
  gates.events_y2027m06, gates.events_y2027m07, gates.events_y2027m08, gates.events_y2027m09,
  gates.events_y2027m10, gates.events_y2027m11, gates.events_y2027m12
  to service_role;

commit;
