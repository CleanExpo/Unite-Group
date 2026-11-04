-- CRM stand-ins for scripts/portal-client-admission-db-proof.sh. THROWAWAY database only.
-- Each table copies a policy SHAPE measured on prod by a read-only catalogue query on 04/11/2026
-- (pg_policies: `auth.role() = 'authenticated'`, `auth.uid() IS NOT NULL`, `true` to authenticated),
-- so the proof attacks the real exposure pattern rather than a toy one.
-- Applied after the portal migrations and BEFORE 20261104040000_portal_client_admission.sql.

-- `auth.role() = 'authenticated'` (73 SELECT policies on prod)
create table public.unified_customers (id uuid primary key default gen_random_uuid(), founder_id uuid, name text);
alter table public.unified_customers enable row level security;
create policy uc_any_signed_in on public.unified_customers for select using (auth.role() = 'authenticated');

-- `auth.uid() IS NOT NULL` for ALL (writes too)
create table public.leads (id uuid primary key default gen_random_uuid(), name text);
alter table public.leads enable row level security;
create policy leads_any_user on public.leads for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- `true` to authenticated, FORCE row security (111 prod tables have FORCE)
create table public.xero_tokens (id uuid primary key default gen_random_uuid(), secret text);
alter table public.xero_tokens enable row level security;
alter table public.xero_tokens force row level security;
create policy xt_any on public.xero_tokens for all to authenticated using (true) with check (true);

-- Name starts with "portal" but is NOT a portal_* table: must still be gated.
create table public.portals_registry (id uuid primary key default gen_random_uuid(), note text);
alter table public.portals_registry enable row level security;
create policy pr_any on public.portals_registry for select using (true);

-- A genuinely public, anon-readable table: the gate must not touch anon.
create table public.public_pages (id uuid primary key default gen_random_uuid(), slug text);
alter table public.public_pages enable row level security;
create policy pp_anon_read on public.public_pages for select to anon using (true);

-- Partitioned table (relkind 'p'): the gate loop must cover it.
create table public.event_log (id bigint, at date not null, note text) partition by range (at);
create table public.event_log_2026 partition of public.event_log for values from ('2026-01-01') to ('2027-01-01');
alter table public.event_log enable row level security;
alter table public.event_log_2026 enable row level security; -- prod: 0 public tables/partitions with row security off
create policy el_any on public.event_log for select using (auth.uid() is not null);

-- The 10 views that run with their owner's rights on prod (security definer views), same names.
create view public.xero_accounts_summary as select count(*) as n, max(secret) as sample from public.xero_tokens;
create view public.metrics_rollup_latest as select id, name from public.unified_customers;
create view public.circuit_ab_test_summary as select 1 as x;
create view public.container_status_view as select 1 as x;
create view public.dashboard_mode_analytics as select 1 as x;
create view public.metrics_attribution_health as select 1 as x;
create view public.onboarding_analytics as select 1 as x;
create view public.rate_limit_analytics as select 1 as x;
create view public.recent_deployments_view as select 1 as x;
create view public.suburb_authority_substrate as select 1 as x;

-- The two maintenance functions, with the grants measured on prod.
create table public.integration_github_actions_runs (id bigint generated always as identity primary key, fetched_at timestamptz not null);
alter table public.integration_github_actions_runs enable row level security; -- no policy: only the definer function reaches it
create function public.prune_integration_history() returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.integration_github_actions_runs where fetched_at < now() - interval '30 days';
end $$;
create function public.set_app_tenant(slug text) returns text language sql security definer as $$
  select set_config('app.current_tenant_slug', slug, true) $$;
revoke execute on function public.set_app_tenant(text) from public, anon;
grant execute on function public.set_app_tenant(text) to authenticated;

-- People. Two staff on the allowlist (seeded by 20260620010000), the invited client, a signed-in stranger.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'phill.mcgurk@gmail.com'),
  ('00000000-0000-0000-0000-000000000002', 'contact@unite-group.in'),
  ('00000000-0000-0000-0000-0000000000a1', 'Ivi@Brii.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'mallory@evil.test');

insert into public.unified_customers (name) values ('Customer A'), ('Customer B'), ('Customer C');
insert into public.leads (name) values ('Lead A'), ('Lead B');
insert into public.xero_tokens (secret) values ('xero-refresh-token-do-not-leak');
insert into public.portals_registry (note) values ('internal');
insert into public.public_pages (slug) values ('home');
insert into public.event_log (id, at, note) values (1, '2026-11-04', 'internal event');
insert into public.integration_github_actions_runs (fetched_at) values (now() - interval '40 days'), (now());

-- Invites: one open and bound to Ivi, one unbound, one expired, one revoked (fake 64-hex hashes).
insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, bound_email, expires_at, revoked_at, created_at) values
  (repeat('1', 64), 'AAAA', 'brii', 'ivi@brii.test', now() + interval '14 days', null, now()),
  (repeat('2', 64), 'BBBB', 'brii', null, now() + interval '14 days', null, now()),
  (repeat('3', 64), 'CCCC', 'brii', 'late@example.test', now() - interval '1 day', null, now() - interval '20 days'),
  (repeat('4', 64), 'DDDD', 'brii', 'revoked@example.test', now() + interval '14 days', now(), now());
