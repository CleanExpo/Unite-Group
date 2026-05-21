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
- Commit: `4f8a4bc8`

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

## Current State

State: Preview Ready

PR #283 is waiting for GitHub CI and Vercel preview. Once green, merge to Synthex `main`, sync local main, and update Linear `UNI-2046`.

## Related

- [[mandatory-close-the-loop-protocol]]
- [[synthex-close-loop-phase1-stabilisation-2026-05-21]]
- [[production-readiness-checklist]]
