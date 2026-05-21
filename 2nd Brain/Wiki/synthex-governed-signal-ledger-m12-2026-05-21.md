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
- Branch: `feat/syn-968-governed-signal-ledger`
- Synthex service file: `lib/marketing-agency/intelligence/signal-ledger.ts`
- Synthex Apify adapter: `lib/marketing-agency/intelligence/apify-signal-adapter.ts`
- Synthex test file: `tests/unit/marketing-agency/signal-ledger.test.ts`
- Synthex Apify test file: `tests/unit/marketing-agency/apify-signal-adapter.test.ts`
- Synthex script: `scripts/marketing-agency-apify-intelligence.ts`

## What Changed

- Added governed source and signal contracts for the Marketing Agency intelligence layer.
- Added deterministic scoring across freshness, confidence, commercial impact, creative potential, and risk.
- Added risk evaluation and approval gates so weak, unsupported, or high-risk signals stay blocked.
- Added opportunity conversion that only promotes governed, evidence-backed signals.
- Added an Apify-to-governed-signal adapter for Google/search and social records.
- Updated `marketing-agency:apify-intel` so stdout is parseable JSON and live output includes `governedSignals`, `rankedSignals`, and `opportunities`.
- Kept the slice service-only: no route, UI, database, provider, publishing, or ad-spend changes.

## Verification

- `npx jest tests/unit/marketing-agency/signal-ledger.test.ts --runInBand` - pass, 5 tests
- `npx jest tests/unit/marketing-agency/apify-signal-adapter.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-intelligence.test.ts --runInBand` - pass, 10 tests
- `npm run type-check` - pass
- `npx eslint lib/marketing-agency/intelligence/apify-signal-adapter.ts lib/marketing-agency/intelligence/signal-ledger.ts tests/unit/marketing-agency/apify-signal-adapter.test.ts tests/unit/marketing-agency/signal-ledger.test.ts tests/unit/marketing-agency/apify-intelligence.test.ts --max-warnings=0` - pass
- `npm run --silent marketing-agency:apify-intel > /tmp/restoreassist-apify-intel-slice2.json` - pass, stdout JSON parsed cleanly with no ANSI codes

## Current State

State: Verified

Live Apify verification on 2026-05-22 produced four Google-derived governed signals and zero opportunity promotions because the returned Google records lacked enough extracted content/metrics to pass the governed opportunity gate. This is correct: partial provider evidence is retained as signals, but weak records do not become recommendations.

This is the contract foundation for the next M12 slices:

- add persistence once the contract is stable
- expose ranked opportunities in the Command Centre or Marketing Agency route
- feed usage and outcome learning back into the Health Loop

## Related

- [[mandatory-close-the-loop-protocol]]
- [[synthex-health-loop-command-centre-2026-05-21]]
- [[omni-governed-analytics-model-2026-05-21]]
- [[synthex]]
