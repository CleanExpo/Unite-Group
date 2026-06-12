---
type: wiki
updated: 2026-05-21
linear: UNI-2046
project: Synthex
---

# Synthex Health Loop Command Centre

This is the next loop after [[synthex-close-loop-phase1-stabilisation-2026-05-21]].

## Purpose

Make the Close the Loop health signal visible in the Synthex Command Center so operators can see whether the evidence chain is healthy without manually checking GitHub, Linear, Wiki, Vercel, and runtime logs.

## Implemented Surface

- Synthex PR: https://github.com/CleanExpo/Synthex/pull/283
- Branch: `feat/health-loop-command-centre`
- Main commit: `9b3c8b8c`

## What Changed

- Command Centre status API now includes `closeLoopHealth`.
- Close Loop red/yellow status rolls into the existing `pipelineHealth` indicator.
- Command Center now renders a compact Health Loop card with:
  - overall state
  - clear pipeline count
  - checked-at freshness
  - per-pipeline runtime status

## Verification

- `npm run type-check` — pass
- `npx eslint app/api/command-centre/status/route.ts components/command-centre/AICommandCentre.tsx components/command-centre/HealthLoopCard.tsx components/command-centre/types.ts --max-warnings=0` — pass
- `npm test -- --runInBand __tests__/unit/close-loop/health.test.ts` — pass
- `bash .github/scripts/design-md-lint.sh` — pass, with pre-existing non-blocking content warnings
- GitHub PR #283 checks — pass: Build, Lint, Type Check, Unit Tests, Security Scan, Snyk, Trivy, CodeQL, Dependency Review, npm Audit, DESIGN lint, CodeRabbit, Vercel preview

## Current State

State: Closed

PR #283 was merged into Synthex `main` and local main was synced to `origin/main` at `9b3c8b8c`.

The Health Loop now gives operators a Command Center surface for Close the Loop runtime evidence, while keeping domain health calculation inside the existing service layer and the route as orchestration.

## Related

- [[mandatory-close-the-loop-protocol]]
- [[synthex-close-loop-phase1-stabilisation-2026-05-21]]
- [[production-readiness-checklist]]
