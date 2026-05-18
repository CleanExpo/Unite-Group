---
type: wiki
updated: 2026-05-18
---

# Semrush Health-Check + Nexus Ingestion/Update Workflow (All Sites)

Objective: run a reliable, budget-aware search-health program across the full Unite portfolio and persist evidence into Nexus for ARR-linked decisioning.

## Scope (all active domains)
- synthex.social
- restoreassist.app
- disasterrecovery.com.au
- nrpg.com.au
- carsi.com.au
- carpetcleanerswarehouse.com.au

## A) Semrush Health-Check Execution Plan

### Cadence
- Daily 06:10 AEST: light diagnostics (trend + anomaly detection)
- Weekly Monday 06:20 AEST: deep diagnostics (keyword/page/competitor decomposition)
- Monthly first business day 06:30 AEST: board trend roll-up

### Endpoint strategy (units + value)
Daily set (low unit burn)
- domain_rank
- backlinks_overview
- visibility trend snapshot

Weekly set (deeper signal)
- domain_organic (top terms)
- domain_organic_pages (top pages)
- competitor overlap set
- position movement set (winners/losers)

Monthly set (board)
- consolidated 90-day trend by domain
- portfolio-level movement summary

### Budget guardrails
- hard session cap: 5,000 units
- hard monthly cap: 30,000 units
- projected breach => skip non-critical endpoints and emit `budget_guardrail_triggered=true`

### Severity thresholds
Critical
- >30% WoW loss in priority keyword footprint
- de-index risk pattern (sudden broad URL disappearance proxies)
- sustained qualified-session drop >25%

Warning
- 10–30% WoW loss in top-20 keyword footprint
- top landing page rank decay with stable demand

Pass
- stable/rising qualified footprint and healthy page distribution

### Required outputs per run
- raw endpoint snapshots (timestamped)
- normalized delta table (DoD/WoW/MoM)
- anomaly list with severity + owner
- Linear ticket linkage for all critical/warning anomalies

## B) Nexus Ingestion and Update Workflow

### Ingestion pipeline
1) Collect: Semrush API pulls by domain + market
2) Normalize: map payloads to canonical Nexus schema
3) Validate: completeness, range bounds, freshness checks
4) Persist: upsert into Nexus tables
5) Reconcile: compare against expected KPI trajectory
6) Publish evidence bundle

### Canonical data entities
- `health_snapshots`
- `keyword_deltas`
- `page_deltas`
- `anomalies`
- `ticket_links`
- `reconciliation_runs`

### Ownership model
- Data owner: PM-Core
- Technical owner: Pi-Dev-Ops
- Business owner: Phill

### Update frequency
- Daily: ingest + anomaly detection
- Weekly: reconciliation against Master Generator priorities
- Fortnightly: founder/board summary outputs

### Exception handling
- API/transient failure: exponential backoff (3 attempts), then degraded state
- Partial payload: persist with `quality_state=partial`, auto-create follow-up ticket
- Schema drift: quarantine payload, alert technical owner, block promotion to board metrics
- Budget breach: run critical-only profile and mark coverage delta

### Proof outputs (mandatory)
- run manifest (domain count, rows written, checksum/hash)
- failed-row report with reason codes
- last-success timestamp per domain
- reconciliation output: expected vs observed movement with confidence level
- ticket evidence map (anomaly -> owner -> SLA)

## C) Runtime Reconciliation Hooks (Master Generator integration)
- drift event -> re-score queue
- high-impact drift -> immediate priority mandate
- low-impact drift -> weekly batch cycle
- unresolved critical drift > 72h -> escalation to founder brief

## D) Success Criteria
- 100% domain coverage at scheduled cadence
- <2% failed ingestions/month
- median anomaly-to-owner assignment < 2 hours
- fortnightly ARR-linked search impact traceable by domain

## Related
- [[synthex-seo-aeo-geo-master-generator-2026-05-18]]
- [[unite-group-nexus-architecture]]
- [[operational-priorities-q2-2026]]
