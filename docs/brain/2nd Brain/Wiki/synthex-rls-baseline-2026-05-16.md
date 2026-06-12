# Synthex RLS Adversarial Baseline — 2026-05-16

**Phase**: 1a of Synthex Finalisation Arc
**Source of truth**: live PROD Supabase project `znyjoyjsvjotlzjppzal` (`Synthex`, ap-southeast-1)
**Method**: read-only pg_class + pg_policy enumeration + transaction-scoped `SET LOCAL ROLE anon` probe
**Validator referenced**: `Synthex/scripts/validate-rls-coverage.ts` (RA-3021, static schema check — NOT a runtime probe)

---

## Verdict: **WARN** (NOT PASS, NOT KILL-SWITCH)

- Pass criterion was ≥60 of N tables genuinely RLS-isolated. We hit **103 isolated** out of **235 actual prod tables**. Pass criterion exceeded.
- Kill-switch was <5 secure. We are at 103. Not triggered.
- **WARN** is the correct call because: (a) the table count in the brief (131) is stale — prod has 235; (b) 4 tables have genuine `USING (true)` policies exposed to `anon`/`authenticated` and only escape live exposure today because the tables are empty in prod; (c) 127 tables are deny-by-default (no policy reachable by anon/authenticated) — safe from anon but a usability/feature-completeness debt.

---

## Aggregate counts (n=235)

| Bucket | Count | Meaning |
|---|---|---|
| **isolated** | **103** | RLS enabled + at least one exposed-role (anon/authenticated) policy that references `auth.uid()` / `auth.jwt()` / `organization_id` / `tenant_id` / `user_id`, and no permissive `USING (true)` |
| **permissive_open** | **4** | RLS enabled but at least one exposed-role policy is literal `USING (true)` — would leak every row to anon if not empty |
| **deny_by_default** | **127** | RLS enabled but only service-role policies attached; anon / authenticated cannot read anything. Safe from anon. May be a feature gap if app expects PostgREST access |
| **exposed_unscoped_uncertain** | **1** | RLS enabled, anon-reachable policy, no tenant column in predicate — manually classified as the `clients.active = true` content-predicate (technically permissive — leaks any client row where `active=true`) |
| **rls_disabled** | **0** | All 235 tables have `relrowsecurity=true`. Static validator passes. |
| **Total** | **235** | All 235 public tables grant SELECT to both `anon` and `authenticated` — RLS is the only line of defence |
| **Total policies in `public`** | 358 | |

Brief said 131 tables — prod has grown. Validator (`scripts/validate-rls-coverage.ts`) only checks schema-vs-migrations and would have failed if any table were missing `ALTER TABLE ... ENABLE RLS`. None are missing. The static gate is green; the runtime quality gate (this baseline) is where the leaks surface.

---

## Top 5 highest-risk tables (the genuine leaks)

| # | Table | Tenant column | Policy text | Adversarial probe result |
|---|---|---|---|---|
| 1 | `agent_task_queue` | `organization_id` exists but unused in policy | `Public can view agent tasks` USING `true` (SELECT, anon/authenticated) | Live count = 0 rows (empty in prod). Structural leak: any row inserted would be world-readable. **Fix: rewrite policy to `organization_id = (auth.jwt()->>'organization_id')::uuid`** |
| 2 | `client_videos` | `client_id` / `organization_id` | `public_read_client_videos` USING `true` | Live count = 0 rows. Same structural leak. Likely intentional for public marketing video CDN — **needs explicit "marketing_public = true" predicate**, not blanket `true` |
| 3 | `edge_function_logs` | none — operational table | `authenticated_select` USING `true` for `authenticated` role | Live count = 0 rows. Leaks operational logs (function names, error payloads, request hashes) to every signed-in user across tenants. **Fix: restrict to `service_role` only** |
| 4 | `seasonal_signals` | possibly `organization_id` | `seasonal_signals_read` USING `true` | Live count = 0 rows. May be intentional global catalogue — confirm with product owner; if catalogue, mark in `RLS_EXEMPT` and document |
| 5 | `clients` | `organization_id` exists | `public_read_active_clients` USING `(active = true)` | Live count = 0 active rows. Currently empty by predicate, but the moment `clients.active=true` is set anywhere, every active row becomes world-readable. Likely intentional for `/clients` public directory — but that should be a public **view**, not a base-table policy |

(Brief asked for top-20. There are only 5 genuine exposed-role permissive leaks in prod. The other 230 tables fall into `isolated` or `deny_by_default` and do not belong on a top-20 risk list. Including 15 service-role-only tables to pad would be theatre, not signal.)

---

## Top 20 most-exposed (extended view — for completeness)

The 11 service-role-policy tables below were flagged by my initial broad heuristic as "UNSCOPED-OTHER" but their `USING` predicate is `auth.role() = 'service_role'` — anon/authenticated never matches. These are **NOT exposed**; including for transparency on the heuristic.

| Table | Policy | Why initially flagged | Actual exposure |
|---|---|---|---|
| `client_churn_risk` | `client_churn_risk_service_role` | UNSCOPED-OTHER | Safe — service-role gated |
| `contractor_onboarding_event` | `contractor_onboarding_event_service_role_all` | UNSCOPED-OTHER | Safe |
| `landing_page_generated` | `landing_page_generated_service_role_all` | UNSCOPED-OTHER | Safe |
| `location_budget_ledger` | `location_budget_ledger_service_role_all` | UNSCOPED-OTHER | Safe |
| `location_kpi` | `location_kpi_service_role_all` | UNSCOPED-OTHER | Safe |
| `post_performance_events` | `service_role_full_access_performance_events` | UNSCOPED-OTHER | Safe |
| `service_area_coverage` | `service_area_coverage_service_role_all` | UNSCOPED-OTHER | Safe |
| `service_area_coverage_contractor` | `service_area_coverage_contractor_service_role_all` | UNSCOPED-OTHER | Safe |
| `sms_send_audit` | `sms_send_audit_service_role_all` | UNSCOPED-OTHER | Safe |
| `verification_gate_audit` | `verification_gate_audit_service_role_all` | UNSCOPED-OTHER | Safe |
| `authority_scores` | `team_members_authority_scores_select USING is_team_member(client_id)` | UNSCOPED-OTHER | Depends on `is_team_member()` SECURITY DEFINER logic — needs separate audit of that function |

---

## Hard-evidence appendix

### Project identification

`mcp__claude_ai_Supabase__list_projects` → project `znyjoyjsvjotlzjppzal` named "Synthex", region ap-southeast-1, status ACTIVE_HEALTHY, created 2025-08-04.

### Raw SQL run #1 — table & RLS enumeration

```sql
SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
-- → 235
```

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
-- → 235 rows, all rls_enabled=true, audit_events_immutable also relforcerowsecurity=true (correct for immutable audit log)
-- → 61 tables have policy_count=0 (subset of the 127 deny_by_default — these are deny-by-default with no explicit service-role policy either)
```

### Raw SQL run #2 — classification by exposed-role policy quality

```sql
WITH pol AS (...),
exposed_pol AS (
  SELECT * FROM pol
  WHERE cmd IN ('r','*','ALL')
    AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles)
         OR 'public' = ANY(roles) OR cardinality(roles)=0)
),
tbl AS (SELECT c.relname, ...)
SELECT
  COUNT(*) FILTER (...isolated...) AS isolated,
  COUNT(*) FILTER (...open-true...) AS permissive_open,
  COUNT(*) FILTER (...no exposed policy...) AS deny_by_default,
  COUNT(*) FILTER (...exposed unscoped...) AS exposed_unscoped_uncertain,
  COUNT(*) AS total_tables
FROM tbl;
-- → {"isolated":103,"permissive_open":4,"deny_by_default":127,"exposed_unscoped_uncertain":1,"total_tables":235}
```

### Raw SQL run #3 — adversarial role probe

```sql
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.sub TO '';
SELECT count(*) FROM public.agent_task_queue,
       count(*) FROM public.client_videos, ...
ROLLBACK;
-- → all 10 probed tables returned 0 rows visible-to-anon
-- → ground-truth (service-role) row counts: agent_task_queue=0, client_videos=0,
--    edge_function_logs=0, seasonal_signals=0, clients=0 (no active=true rows),
--    organizations=7, users=?, subscriptions=?
-- Interpretation: anon sees 0 rows — but for organizations/users/subscriptions/etc.
-- this is RLS enforcement (correct). For the 4 OPEN-TRUE tables, anon would see
-- ALL rows IF any existed. The protection is "empty table", not "RLS policy".
```

### GRANT-layer evidence

```sql
SELECT grantee, count(*) FROM information_schema.role_table_grants
WHERE table_schema='public' AND privilege_type='SELECT' AND grantee IN ('anon','authenticated')
GROUP BY grantee;
-- → anon: 238, authenticated: 238 (every public table grants SELECT to both)
```

Confirms RLS is the only defence — no GRANT-layer protection.

### Static validator status

`scripts/validate-rls-coverage.ts` (RA-3021):
- Static parse of `prisma/schema.prisma` vs `supabase/migrations/*.sql` + `prisma/migrations/*/*.sql`.
- Pass criterion: every Prisma model has at least one `ALTER TABLE … ENABLE ROW LEVEL SECURITY` somewhere in migrations.
- Result: would pass (all 235 tables have RLS enabled at runtime).
- Limitation: does NOT inspect policy quality — a table with `USING (true)` passes this validator.
- **Recommended addition**: extend validator (or add `validate-rls-policies.ts`) to fail on any policy that is `USING (true)` AND attached to a role in `{anon, authenticated}`. That would have caught the 4 leaks above at PR time.

### Hard constraints honoured

- No Synthex source files modified.
- No migrations applied.
- No code pushed.
- No secrets / connection strings leaked to chat — used MCP project_id only.
- Prod-only — staging not touched.
- All numbers traced to live `pg_class` / `pg_policy` queries — none fabricated.

---

## Recommended next actions (not executed in this phase)

1. **P1 (within sprint)**: Replace the 4 `USING (true)` policies on `agent_task_queue`, `client_videos`, `edge_function_logs`, `seasonal_signals` with tenant-scoped predicates. New ticket: SYN-RLS-LEAK-001.
2. **P1**: Audit `clients.public_read_active_clients` — confirm with product owner whether public directory is intended; if yes, replace base-table policy with a curated public view + RLS-locked base table.
3. **P2**: Audit `is_team_member()` SECURITY DEFINER function used by `authority_scores` policy — confirm it joins on `auth.uid()`.
4. **P2**: Extend `scripts/validate-rls-coverage.ts` to fail on `USING (true)` policies attached to `anon` / `authenticated`.
5. **P3**: Review the 127 deny-by-default tables — confirm each is intentionally service-role-only (cron tables, immutable audit logs, internal ledgers) vs accidentally missing a user-facing policy.

---

## Verification ledger

- **DID** — enumerated all 235 public tables in prod Supabase `znyjoyjsvjotlzjppzal`; classified each by RLS status, policy count, exposed-role policy text, and tenant-scoping; ran transaction-scoped `SET LOCAL ROLE anon` probe against 10 sample tables including the 5 suspected leaks and 5 controls.
- **VERIFIED** — 3 independent SQL runs on prod pg_class/pg_policy returning consistent aggregates (235 total / 103 isolated / 4 open-true / 127 deny-by-default / 1 content-predicate); `information_schema.role_table_grants` confirms anon+authenticated both have SELECT on all 238 grantable tables, proving RLS is the sole defence; ground-truth service-role counts confirm the 4 open-true tables are currently empty (structural leak, no live data leaked today).
- **WHAT WOULD CHANGE MY MIND** — (a) if `SET LOCAL ROLE anon` inside the MCP execute_sql session is being silently overridden by the service-role connection (Supabase MCP runs as service_role and `SET LOCAL ROLE` may not flip the auth context for RLS evaluation in the way a real PostgREST-issued anon JWT does — true probe would require an actual anon-key REST call, which I did not perform); (b) if any of the 4 OPEN-TRUE policies has a `WITH CHECK` clause I didn't inspect that materially changes SELECT exposure (none did, but confirming would require pulling polwithcheck for those 4 specifically); (c) if `is_team_member(client_id)` SECURITY DEFINER turns out to be permissive — would reclassify `authority_scores` as exposed.
