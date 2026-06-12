---
type: wiki
updated: 2026-05-18
---

# Synthex SEO/AEO/GEO Master Generator — Runtime Reconciliation + Deployment Lifecycle Architecture

Purpose: turn search visibility into ARR by running an evidence-gated system across Google Search, Google AI surfaces, Bing Search, and Bing/Copilot grounding surfaces.

## $2B Filter (non-negotiable)
Approved work must move at least one of:
- qualified pipeline volume,
- free-to-paid conversion,
- net revenue retention,
- CAC payback time.

If a stream improves impressions but not pipeline/conversion/ARR, it is de-prioritised.

## Technical Translation Blueprint
User intent:
- simplify provisioning and repair by moving repeated runtime mechanics into reusable structured models,
- keep Convex actions responsible for domain policy and governance.

Target architecture:
- Presentation/Entry layer: Convex actions + API routes (auth, ownership, status transitions, audit events, persistence decisions, user-facing error policy).
- Service layer: reusable runtime/deployment mechanics (credential reads, setup, validation, readiness, restart, teardown, compensation).
- Repository/Integration layer: GSC/Bing/Semrush/Nexus/queue/storage adapters.

Token optimisation strategy:
- one shared ServiceResult contract,
- one orchestration lifecycle contract reused across workers,
- zero repeated retry/validation boilerplate in action handlers.

Autonomous tool/pattern selection:
- Service Layer pattern + typed Result pattern + Saga compensation for multi-system faults.

## Official standards constraints (from t3 evidence pass)
1) Crawlability is prerequisite zero.
- robots.txt controls crawl access; it is not the primary deindex mechanism.

2) Index/serving controls must be explicit and continuously validated.
- noindex / nosnippet / max-snippet / X-Robots-Tag drift can suppress eligibility.

3) Canonical consistency must be enforced.
- missing/misaligned canonicals create duplicate-cluster ambiguity and split authority.

4) Structured data is an eligibility/enrichment layer, not a ranking bypass.
- schema quality and visible-content parity matter more than markup volume.

5) AI citation eligibility sits on traditional crawl/index/ranking foundations.
- Bing explicitly ties Copilot/grounding eligibility to the same core SEO stack.

## Service Boundary Contract
```ts
export type ServiceResult<T, E extends string = string> =
  | { ok: true; data: T; evidence?: Record<string, unknown> }
  | { ok: false; reason: E; detail?: string; retryAfterMs?: number; cause?: unknown; evidence?: Record<string, unknown> };
```

## Runtime Reconciliation Lifecycle (detect -> re-score -> republish -> verify -> decide)
1. Detect drift
- compare expected state vs observed state:
  - crawl access,
  - index eligibility,
  - canonical alignment,
  - schema integrity,
  - citation/ranking/conversion deltas.

2. Re-score
- compute priority score = ARR proximity + opportunity size + technical risk + execution cost + confidence.

3. Re-publish
- regenerate metadata/schema/content/internal links under policy constraints.

4. Verify citation lift
- measure engine-specific deltas:
  - Google: index/rich-result/click/qualified-session conversion deltas,
  - Bing: index/grounding-citation/qualified-session conversion deltas.

5. Decide
- keep, iterate, rollback, or quarantine based on thresholds.

## Deployment Provisioning + Repair Lifecycle
Provision -> Validate -> Readiness -> Publish -> Observe -> Repair/Restart -> Rollback/Teardown

Rule:
- Convex actions orchestrate policy + state transitions.
- Runtime/deployment service modules execute mechanics and return structured results.

Required reusable service modules:
- credentials.service
- runtime-setup.service
- validator.service
- readiness.service
- restart-repair.service
- teardown.service

## Specialised Agent Topology
- Signal Harvester: collects SERP/AI/citation/index signals.
- Entity Mapper: validates entity coherence (org/person/product/about/contact).
- Intent Clusterer: maps demand clusters to hub/spoke targets.
- Content Constructor: produces/revises pillar + spoke assets.
- Schema Steward: validates schema parity and type hygiene.
- Link Architect: reinforces internal authority pathways.
- Technical Gatekeeper: crawl/index/canonical/robots/sitemap checks.
- Experiment Conductor: controlled tests for headline/body/structure changes.
- Revenue Analyst: links visibility deltas to pipeline/conversion/ARR.
- Orchestrator (PM-Core): queueing, gates, evidence pack publishing.

## Hard gates
- No publish if crawl/index prerequisites fail.
- No experiment scale-out without conversion-linked signal.
- No schema expansion without visible-content parity.
- No board claim without before/after evidence pack.

## Evidence Pack (release minimum)
- Baseline vs post-change metrics (engine separated)
- Changed URLs + change rationale
- Citation/ranking/click/conversion deltas
- Exceptions + compensation actions
- Next-cycle priority map

## Execution tracker
- [x] t3 Official Google/Bing evidence pass complete
- [x] t4 Master Generator architecture + runtime reconciliation lifecycle + specialised topology complete
- [ ] t4.1 Implement shared runtime service interfaces in codebase
- [ ] t4.2 Refactor action handlers to orchestration-only policy modules
- [ ] t4.3 Add structured drift events and reconciliation queue
- [ ] t4.4 Add citation-lift verification jobs and rollback thresholds
- [ ] t4.5 Add deployment repair playbook + alert routing
- [ ] t4.6 Add architecture boundary conformance tests

## Related
- [[synthex]]
- [[operational-priorities-q2-2026]]
- [[semrush-health-check-and-nexus-ingestion-plan-2026-05-18]]
