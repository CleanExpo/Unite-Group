---
type: board-pack
updated: 18/05/2026
status: ready-for-board
---

# Board Execution Mandate Pack — t4.1 to t4.6 Production Implementation

## Decision Lock (Evidence)
- Ownership lock confirmed.
- Commit: `6bc5213` — docs: add Synthex Unite-Group t4 execution mandate.
- Primary production owner: `CleanExpo/Unite-Group`
- Runtime codebase: `/Users/phill-mac/pi-seo-workspace/unite-group`
- Capability boundary owner: `CleanExpo/Synthex` (SEO/AEO/GEO product capability)
- Orchestration owner: `CleanExpo/Pi-Dev-Ops` (dispatch only)
- Mandate/evidence owner: `2nd Brain`

## Why this is the right move for $2B by 30/06/2028
This converts architecture proof into operational reliability and measurable growth evidence.
Without t4.1–t4.6 in production, we cannot credibly connect visibility movement to qualified demand and ARR.

## Board Outcome Required
Approve a two-wave execution with hard gates:
1) De-risk runtime reliability in Unite-Group first
2) Then scale portfolio reconciliation and ARR-linked evidence

## Scope
In scope (production implementation):
- t4.1 Service interfaces
- t4.2 Action/route refactor
- t4.3 Reconciliation queue + drift events
- t4.4 Verification jobs
- t4.5 Repair playbook + alert routing
- t4.6 Boundary conformance tests

Out of scope (this mandate):
- Synthex product-side publish mechanics changes before Wave 1 gate passes
- Any Convex migration

## Sequencing (Two Waves)

### Wave 1 (Days 1–5): Runtime Foundation + Pilot
Goal: prove lifecycle wrapper and control boundary without customer-facing SEO behaviour changes.

Deliverables:
- `src/lib/runtime/types.ts`
- `src/lib/runtime/sync-state-repo.ts`
- `src/lib/runtime/sync-lifecycle.ts`
- Pilot migration of one integration route (`onepassword`) to `withSyncLifecycle`
- Boundary tests to prove route handlers do not directly write lifecycle state

Gate to exit Wave 1:
- Runtime unit tests green
- Type-check green
- Lint green (or pre-existing unrelated lint debt explicitly logged)
- Sandbox evidence shows lifecycle transitions (seed -> running -> ok/partial/error)
- Auth behaviour unchanged (invalid bearer = 401, valid secret proceeds)
- No Synthex code changes

### Wave 2 (Days 6–10): Portfolio Reconciliation + Evidence Strength
Condition: Wave 1 gate fully green.

Deliverables:
- Remaining integration route migrations:
  - github, vercel, railway, linear, digitalocean, stripe, supabase, composio
- Reconciliation queue and structured drift records (owner, severity, confidence, SLA)
- Citation-lift verification jobs (read-only first)
- Repair playbook wiring to owner-visible actions
- Full boundary conformance suite across migrated routes

Gate to exit Wave 2:
- Independent rollback path per route
- Sandbox-first schema discipline maintained
- Drift queue records complete and actionable
- Verification jobs produce before/after evidence shape
- Critical anomalies create owner-visible tickets
- No publish/republish action if crawl/index/canonical prereqs fail

## Owner Map
- Board Sponsor: CEO / PM-Core
- Technical Owner: Unite-Group implementation lead
- Product Boundary Owner: Synthex lead
- Data/Evidence Owner: Nexus evidence model owner
- Revenue Evidence Owner: Revenue analyst (qualified sessions, conversion, ARR influence)
- QA Owner: Technical Architect + Contrarian review before Wave 2 promotion

## Merge Gates (PR-Level)
No merge to `main` for t4 work unless all are true:
1. CI checks pass
2. Boundary tests pass
3. Sandbox verification artefacts attached to PR
4. Rollback steps included in PR description
5. Scope remains inside assigned wave
6. No unauthorised cross-repo spillover

## Risk Controls
- Kill criterion 1: wrapper changes auth/cadence behaviour
- Kill criterion 2: queue emits unowned critical alerts
- Kill criterion 3: evidence uplift with no conversion movement across two cycles
- Kill criterion 4: operating cost rises without demand/ARR contribution

If any kill criterion trips:
- Freeze further rollout
- Run repair playbook
- Escalate to board brief with 24-hour recovery plan

## Board Decisions (tick one per line)
1. Two-wave plan: [ ] APPROVE  [ ] DEFER  [ ] REJECT
2. Wave 1 pilot route (`onepassword`): [ ] APPROVE  [ ] DEFER  [ ] REJECT
3. Wave 2 start condition (Wave 1 all-green only): [ ] APPROVE  [ ] DEFER  [ ] REJECT
4. Merge gate policy (strict): [ ] APPROVE  [ ] DEFER  [ ] REJECT

## Immediate Next Action on Approval
- Open Wave 1 execution branch in `CleanExpo/Unite-Group`
- Implement t4.1 + pilot t4.2 + t4.6 boundary tests
- Return first evidence bundle for board review before Wave 2 unlock

## Evidence Links
- Runtime mandate: `Wiki/synthex-unite-group-t4-runtime-execution-mandate-2026-05-18.md`
- Commit proof: `6bc5213`
