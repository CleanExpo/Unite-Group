---
type: mandate
updated: 2026-05-18
---

# Synthex / Unite-Group t4 Runtime Execution Mandate

Board-ready mandate for converting the Synthex SEO/AEO/GEO Master Generator architecture into production implementation across Nexus and Synthex.

## Direct Ownership Ruling

Primary production owner: `CleanExpo/Unite-Group`, local repo `/Users/phill-mac/pi-seo-workspace/unite-group`.

Reason: the executable runtime reconciliation plan already exists in that repo:
- `docs/superpowers/specs/2026-05-18-runtime-reconciliation-design.md`
- `docs/superpowers/plans/2026-05-18-runtime-reconciliation-implementation.md`
- nine integration cron routes under `src/app/api/cron/integrations/<svc>/route.ts`
- Nexus/Supabase schema, sandbox wizard, portfolio source monitoring, and the evidence dashboard surface.

Secondary product owner: `CleanExpo/Synthex`, local repo `/Users/phill-mac/Synthex`.

Reason: Synthex owns the SEO/AEO/GEO product modules, citation dashboards, GEO scoring, schema, search-console routes, and publish mechanics. It does not own the first implementation of t4.1-t4.6. Synthex changes become Wave 2 contract work after the Unite-Group runtime lifecycle and evidence boundary are proven.

Pi-CEO ownership: orchestration and worker dispatch only. `CleanExpo/Pi-Dev-Ops` does not own the runtime code for t4.1-t4.6.

2nd Brain ownership: board mandate, evidence trail, and decision record only. No production implementation lives in the vault.

## Wiki Grounding

- From `exit-thesis`: every decision is filtered through AUD $2B by 30 June 2028, with implied ARR at exit of roughly AUD $167M-$250M.
- From `operational-priorities-q2-2026`: Synthex is the in-house marketing execution platform, no ad spend is allowed, and agents own execution while Phill remains think tank.
- From `synthex`: Synthex is the Unite-Group product at `synthex.social`, with existing SEO/GEO/citation surfaces and a Supabase-only auth rule.
- From `unite-group-nexus-architecture`: Nexus is the portfolio command center and client-sector evidence layer; Synthex output belongs in Nexus when it affects client/portfolio execution.
- From `semrush-health-check-and-nexus-ingestion-plan-2026-05-18`: all six portfolio domains require scheduled health checks, normalized Nexus persistence, anomaly ownership, and proof outputs.

## Corrective Technical Ruling

The prior architecture language said "Convex actions." That is not the implementation substrate for the current Unite-Group repo.

Implementation target for t4.1-t4.6:
- Next.js App Router route handlers
- Supabase persistence
- Vercel cron / Node.js runtime
- `integration_sync_state` plus Nexus evidence tables
- sandbox-first migration discipline via `scripts/sandbox-wizard.sh`

No Convex migration is authorized by this mandate.

## Two-Wave Delivery

This is a two-wave delivery with a hard stop/go gate after Wave 1. Wave 2 starts only after the runtime wrapper is proven on one low-risk integration and the evidence output is visible.

### Wave 1: Runtime Foundation and One Pilot

Window: days 1-5.

Goal: prove the reusable runtime lifecycle in Unite-Group without changing Synthex product behavior.

Scope:
- t4.1: create shared runtime interfaces:
  - `src/lib/runtime/types.ts`
  - `src/lib/runtime/sync-state-repo.ts`
  - `src/lib/runtime/sync-lifecycle.ts`
- t4.2: migrate one low-risk cron integration to `withSyncLifecycle`.
- t4.6: add boundary tests proving route handlers delegate mechanics and do not write Supabase lifecycle state directly.

Pilot integration: `onepassword`.

Why: it has daily cadence, low customer-facing blast radius, and mirrors the implementation plan already written in the Unite-Group repo.

Wave 1 merge gates:
- Unit tests pass for runtime types, lifecycle wrapper, and sync-state repo.
- `npm run type-check` passes in `/Users/phill-mac/pi-seo-workspace/unite-group`.
- `npm run lint` passes or has a documented pre-existing failure unrelated to the diff.
- Sandbox verification proves `integration_sync_state` moves through seed -> running -> ok/partial/error.
- One migrated route keeps existing auth behavior: invalid bearer returns 401, valid CRON_SECRET proceeds.
- No Synthex repo changes.
- No production database write until sandbox evidence is captured.

Wave 1 board output:
- one evidence note with commit, test output, sandbox row proof, and rollback command.

### Wave 2: Portfolio Reconciliation and Synthex Contract Boundary

Window: days 6-10, conditional on Wave 1 green gate.

Goal: connect runtime reliability to portfolio search visibility and ARR-linked evidence.

Scope:
- t4.2: migrate remaining integration routes one at a time:
  - github
  - vercel
  - railway
  - linear
  - digitalocean
  - stripe
  - supabase
  - composio
- t4.3: add structured drift events and reconciliation queue for Semrush/Nexus observations.
- t4.4: add citation-lift verification jobs with rollback thresholds.
- t4.5: add repair playbook wiring and alert routing.
- t4.6: enforce architecture boundary tests across all migrated routes.

Wave 2 merge gates:
- Each route migration lands independently and can be reverted independently.
- Schema changes use sandbox wizard first; no direct prod migration.
- `check:schema-drift` passes after generated type updates, or the schema delta is explicitly documented.
- Reconciliation queue records include domain, source, severity, confidence, expected movement, observed movement, and owner.
- Citation-lift jobs are read-only until baseline evidence exists for at least one domain.
- Repair routing creates owner-visible tickets for warning/critical anomalies.
- No publish, republish, or scale-out if crawl/index/canonical prerequisites fail.

Wave 2 board output:
- portfolio evidence pack with per-domain status for:
  - `synthex.social`
  - `restoreassist.app`
  - `disasterrecovery.com.au`
  - `nrpg.com.au`
  - `carsi.com.au`
  - `carpetcleanerswarehouse.com.au`

## t4.1-t4.6 Work Map

### t4.1 Shared Runtime Service Interfaces

Owner repo: `/Users/phill-mac/pi-seo-workspace/unite-group`

Deliverables:
- `SyncResult`
- `SyncStatus`
- `SyncLifecycleConfig`
- `withSyncLifecycle`
- `sync-state-repo`

Acceptance:
- route lifecycle mechanics live in `src/lib/runtime/*`
- cron route handlers hold only integration identity, cadence policy, and service-specific failure formatting.

### t4.2 Action Handler Refactor

Owner repo: `/Users/phill-mac/pi-seo-workspace/unite-group`

Deliverables:
- replace duplicated lifecycle code in each integration route with `withSyncLifecycle(...)`
- preserve existing `runtime`, `maxDuration`, auth semantics, and cadence.

Acceptance:
- each route diff is small and independently reversible
- no route imports `getAdminClient` for lifecycle writes after migration.

### t4.3 Structured Drift Events and Reconciliation Queue

Owner repo: `/Users/phill-mac/pi-seo-workspace/unite-group`

Deliverables:
- Nexus persistence for search/AI drift events
- queue state for re-score, priority, owner, SLA, and evidence bundle linkage.

Acceptance:
- every warning/critical drift has owner, severity, source, confidence, and next action
- budget guardrail state is persisted, not just logged.

### t4.4 Citation-Lift Verification Jobs

Owner split:
- Unite-Group owns the scheduled verification job and Nexus evidence record.
- Synthex owns product-level SEO/AEO/GEO metric sources and any publish-side hooks once the contract is stable.

Deliverables:
- read-only verification job first
- rollback threshold config
- before/after evidence shape.

Acceptance:
- no positive board claim without before/after data
- no rollback/republish action without recorded threshold breach.

### t4.5 Deployment Repair Playbook and Alert Routing

Owner repo: `/Users/phill-mac/pi-seo-workspace/unite-group`

Deliverables:
- repair playbook for failed integration syncs, stale evidence, schema drift, and budget breach
- alert routing to Linear/Kanban/board evidence surfaces.

Acceptance:
- each critical anomaly creates an owner-visible action
- repeated unresolved critical drift over 72 hours escalates to founder/board brief.

### t4.6 Boundary Conformance Tests

Owner repo: `/Users/phill-mac/pi-seo-workspace/unite-group`

Deliverables:
- runtime wrapper tests
- repo persistence tests
- route conformance tests for migrated integrations
- no-direct-DB-lifecycle-write guard.

Acceptance:
- tests fail if a route reintroduces duplicated lifecycle mechanics
- tests prove auth, status classification, and error persistence.

## Owner Map

Board sponsor: CEO / PM-Core.

Technical owner: Unite-Group implementation lead.

Product owner: Synthex product lead for SEO/AEO/GEO capability boundaries.

Data owner: Nexus evidence model owner.

Revenue owner: Revenue Analyst, accountable for qualified-session, conversion, and ARR-linked evidence.

QA owner: Technical Architect plus Contrarian review before Wave 2 production promotion.

## Release Gates

Gate 0: mandate locked in 2nd Brain.

Gate 1: Wave 1 tests and sandbox proof green.

Gate 2: one pilot route deployed and observed for one successful scheduled run.

Gate 3: remaining route migrations complete with independent rollback path.

Gate 4: reconciliation queue records real drift events with owner/severity/confidence.

Gate 5: citation-lift verification produces before/after evidence without manual spreadsheet stitching.

Gate 6: board evidence pack ties visibility movement to qualified sessions, demo/trial starts, paid conversion, or ARR influence.

## Kill Criteria

- Wrapper creates hidden behavior changes in auth, cadence, or state persistence.
- Sandbox cannot prove state transitions.
- Reconciliation queue produces alerts with no owner or action.
- Evidence improves impressions but not qualified demand or conversion after two cycles.
- Operating cost rises while conversion contribution stays flat.

## Board Decision

Proceed with the two-wave plan.

Start in `CleanExpo/Unite-Group`, not Synthex. Use Synthex as the product capability source and later integration boundary. Keep Pi-CEO as orchestration, not runtime owner. Keep the 2nd Brain as the decision and evidence record.

## Related

- [[exit-thesis]]
- [[operational-priorities-q2-2026]]
- [[synthex]]
- [[unite-group-nexus-architecture]]
- [[synthex-search-growth-management-index-2026-05-18]]
- [[synthex-seo-aeo-geo-master-generator-2026-05-18]]
- [[semrush-health-check-and-nexus-ingestion-plan-2026-05-18]]
