---
type: wiki
updated: 2026-05-22
linear: SYN-968
project: Synthex
---

# Synthex Governed Signal Ledger M12

This is the next implementation loop after [[synthex-health-loop-command-centre-2026-05-21]].

## Purpose

Make Synthex convert live market, search, social, client, and creative inputs into governed intelligence objects before they become campaign recommendations.

M12 follows the pattern from [[omni-governed-analytics-model-2026-05-21]]:

```text
Source Data -> Ontology Object -> Linked Evidence -> Signal Score -> Agent Action -> Scenario/Draft -> Approval Gate -> Outcome Learning
```

## Implemented Slices

- Linear issue: SYN-968
- Branch: `feat/syn-968-signal-persistence`
- Synthex service file: `lib/marketing-agency/intelligence/signal-ledger.ts`
- Synthex Apify adapter: `lib/marketing-agency/intelligence/apify-signal-adapter.ts`
- Synthex test file: `tests/unit/marketing-agency/signal-ledger.test.ts`
- Synthex Apify test file: `tests/unit/marketing-agency/apify-signal-adapter.test.ts`
- Synthex persistence service: `lib/marketing-agency/intelligence/signal-persistence.ts`
- Synthex persistence test file: `tests/unit/marketing-agency/signal-persistence.test.ts`
- Synthex opportunity reader: `lib/marketing-agency/intelligence/opportunity-reader.ts`
- Synthex opportunity API: `app/api/marketing-agency/opportunities/route.ts`
- Synthex dashboard panel: `components/marketing-agency/GovernedOpportunitiesPanel.tsx`
- Synthex opportunity tests: `tests/unit/marketing-agency/opportunity-reader.test.ts`, `tests/unit/api/marketing-agency-opportunities.test.ts`
- Synthex Health Loop service: `lib/close-loop/health.ts`
- Synthex Command Centre status API: `app/api/command-centre/status/route.ts`
- Synthex Health Loop UI: `components/command-centre/HealthLoopCard.tsx`
- Synthex Health Loop types: `components/command-centre/types.ts`
- Synthex Health Loop test file: `__tests__/unit/close-loop/health.test.ts`
- Synthex script: `scripts/marketing-agency-apify-intelligence.ts`
- Synthex migration: `prisma/migrations/20260522_add_marketing_agency_signal_persistence/migration.sql`

## What Changed

- Added governed source and signal contracts for the Marketing Agency intelligence layer.
- Added deterministic scoring across freshness, confidence, commercial impact, creative potential, and risk.
- Added risk evaluation and approval gates so weak, unsupported, or high-risk signals stay blocked.
- Added opportunity conversion that only promotes governed, evidence-backed signals.
- Added an Apify-to-governed-signal adapter for Google/search and social records.
- Updated `marketing-agency:apify-intel` so stdout is parseable JSON and live output includes `governedSignals`, `rankedSignals`, and `opportunities`.
- Added organization-scoped persistence for governed signals, opportunities, and outcome-learning events.
- Added opt-in Apify persistence via `MARKETING_AGENCY_SIGNAL_ORGANIZATION_ID`; JSON-only runs remain the default when this is unset.
- Added an authenticated, organization-scoped opportunities read API and Marketing Agency dashboard panel.
- Added Marketing Agency outcome events to the Command Centre Health Loop as optional learning signals.
- Kept missing or stale outcome events separate from required CI/Wiki/semantic pipeline health so new organizations do not fail the core loop before campaigns have outcomes.
- Addressed PR #285 review gates: malformed signal timestamps now fail fast, outcome events reject missing or cross-signal opportunities, stale outcome learning is observable, composite tenant-scoped signal/opportunity relations are enforced, Apify persistence failures stay structured JSON, and the opportunity panel uses the shared API hook.
- Kept the slice out of execution/publishing: no provider endpoint, action button, publishing, or ad-spend changes.

## Verification

- `npx jest tests/unit/marketing-agency/signal-ledger.test.ts --runInBand` - pass, 5 tests
- `npx jest tests/unit/marketing-agency/apify-signal-adapter.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-intelligence.test.ts --runInBand` - pass, 10 tests
- `npm run type-check` - pass
- `npx eslint lib/marketing-agency/intelligence/apify-signal-adapter.ts lib/marketing-agency/intelligence/signal-ledger.ts tests/unit/marketing-agency/apify-signal-adapter.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-intelligence.test.ts --max-warnings=0` - pass
- `npm run --silent marketing-agency:apify-intel > /tmp/restoreassist-apify-intel-slice2.json` - pass, stdout JSON parsed cleanly with no ANSI codes
- `npx prisma validate` - pass
- `npx prisma generate` - pass
- `npx jest tests/unit/marketing-agency/signal-persistence.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-signal-adapter.test.ts tests/unit/marketing-agency/apify-intelligence.test.ts --runInBand` - pass, 14 tests
- `npm run type-check` - pass
- `npx eslint lib/marketing-agency/intelligence/signal-persistence.ts tests/unit/marketing-agency/signal-persistence.test.ts --max-warnings=0 && npx eslint scripts/marketing-agency-apify-intelligence.ts --no-warn-ignored --max-warnings=0` - pass
- `npm run --silent marketing-agency:apify-intel > /tmp/restoreassist-apify-intel-slice3-lazy.json` - pass, stdout JSON parsed cleanly with no ANSI codes; persistence skipped because `MARKETING_AGENCY_SIGNAL_ORGANIZATION_ID` was not configured
- `npx jest tests/unit/api/marketing-agency-opportunities.test.ts tests/unit/marketing-agency/opportunity-reader.test.ts tests/unit/api/command-centre-provider-readiness.test.ts tests/unit/marketing-agency/signal-persistence.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-signal-adapter.test.ts --runInBand` - pass, 20 tests
- `npm run type-check` - pass
- `npm run lint` - pass
- `npm test -- --runInBand` - pass, 220 suites and 3,557 tests
- `npm run build` - pass, includes `/api/marketing-agency/opportunities`
- Playwright smoke against `next start -p 3011` - pass for `/dashboard/marketing-agency` rendering `Ranked Opportunities` and `Open Package`; unauthenticated/invalid local cookie produced expected API 400/401 console fetch errors because local DB/auth env was not configured
- `npx jest __tests__/unit/close-loop/health.test.ts tests/unit/api/command-centre-provider-readiness.test.ts --runInBand` - pass, 7 tests
- `npm run type-check` - pass
- `npx eslint lib/close-loop/health.ts app/api/command-centre/status/route.ts components/command-centre/types.ts components/command-centre/HealthLoopCard.tsx __tests__/unit/close-loop/health.test.ts --max-warnings=0` - pass
- `npm run lint` - pass
- `npm test -- --runInBand` - pass, 220 suites and 3,559 tests
- `npm run build` - pass, includes `/api/command-centre/status` and `/dashboard`
- `git diff --check` - pass
- `npx prisma validate` - pass after review-gate schema changes
- `npx prisma generate` - pass after review-gate schema changes
- `npx jest tests/unit/marketing-agency/signal-persistence.test.ts __tests__/unit/close-loop/health.test.ts --runInBand` - pass, 12 tests
- `npm run --silent marketing-agency:apify-intel > /tmp/restoreassist-apify-intel-review-fix.json` - pass, stdout JSON parsed cleanly; persistence skipped because `MARKETING_AGENCY_SIGNAL_ORGANIZATION_ID` was not configured
- `npm run lint` - pass
- `npm test -- --runInBand` - pass, 220 suites and 3,563 tests
- `npm run build` - pass after review-gate fixes
- `git diff --check` - pass

## Current State

State: Production-verified

Live Apify verification on 2026-05-22 produced Google-derived governed signals and zero opportunity promotions because the returned Google records lacked enough extracted content/metrics to pass the governed opportunity gate. This is correct: partial provider evidence is retained as signals, but weak records do not become recommendations.

Slice 3 adds the durable store for this loop:

- `marketing_agency_signals` stores source, evidence, score, risk, approval gate, raw signal, and campaign/org scope.
- `marketing_agency_opportunities` stores promoted recommendations linked back to persisted signal rows.
- `marketing_agency_outcome_events` stores observed approval/performance/learning events for Health Loop feedback.

Slice 4 exposes the durable opportunity ledger:

- `GET /api/marketing-agency/opportunities` returns active-organization opportunities with signal source, score, risk, evidence, approval, next action, and outcome metric.
- `/dashboard/marketing-agency` now renders a passive `Ranked Opportunities` panel backed by that API.
- The panel is review-only; it does not create provider execution, publish, or spend controls.

Slice 5 closes the M12 visibility loop:

- `GET /api/command-centre/status` now passes the active organization into `fetchCloseLoopHealth`.
- `fetchCloseLoopHealth` reads recent `marketingAgencyOutcomeEvent` rows and emits a `marketing-agency-outcomes` learning snapshot.
- `HealthLoopCard` displays outcome learning beside required pipeline health.
- Outcome learning is passive observability only; no campaign execution, provider publishing, or ad-spend controls were added.

Review-gate fix `ca417ea0` hardens the slice before merge:

- Outcome events are only created when the supplied opportunity belongs to the same persisted signal.
- Historical outcome events are fetched so the Health Loop can report `stale` instead of collapsing old data into `no_data`.
- Signal capture timestamps no longer fall back to current time when upstream data is malformed.
- Prisma and SQL migration relations include `organizationId` in signal/opportunity foreign keys.
- RLS policies include active business ownerships and accepted team members.

Merge and production closure:

- PR #285 merged on 2026-05-21 as `3b455501`.
- Production migration prerequisite gap found after merge: the deploy workflow does not apply Prisma migrations, and production was missing `marketing_agency_campaigns`.
- PR #286 merged on 2026-05-21 as `e033ab1a` to add the missing campaign prerequisite table, campaign RLS policy, indexes, and trigger to the M12 migration source.
- The M12 migration was applied manually to production using trimmed `DIRECT_URL` from ignored local env, with no secret values written to tracked files or chat.
- Production DB verification confirmed `marketing_agency_campaigns`, `marketing_agency_signals`, `marketing_agency_opportunities`, and `marketing_agency_outcome_events` exist with org-isolation RLS policies and composite tenant foreign keys.
- Post-merge dependency security gate found a Dependabot blocker: `react-use@17.6.0` pinned vulnerable `js-cookie@2.2.1` while the fixed line is `js-cookie@3.0.7`.
- PR #287 merged on 2026-05-22 as main commit `642258b3`; it removed the `react-use` dependency path, replaced `SearchBar` debounce with local React timer logic, and moved `hasZipMagic` out of a Next route module export.
- Main commit `642258b3` is green across CI, Security, DESIGN.md lint, Deploy, deploy-workflow Lighthouse, standalone Lighthouse Audit, and live production smoke.
- Public smoke check for `https://synthex.social` returned HTTP/2 200 from Vercel.

## Related

- [[mandatory-close-the-loop-protocol]]
- [[synthex-health-loop-command-centre-2026-05-21]]
- [[omni-governed-analytics-model-2026-05-21]]
- [[synthex]]
