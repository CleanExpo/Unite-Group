# Synthex CI Red-on-Main — Root Cause (2026-05-16)

> **Phase**: 1d — Synthex Finalisation Arc
> **Diagnosis only**: NO fix pushed by this pass. Existing PR #241 already carries the fix.
> **Status**: Main is RED on every push since 2026-05-12 (PR #231 merge).

## TL;DR

CI on `main` has been red for ~3 days. Root cause is **NOT** the Dependabot bumps (protobufjs 7.5.5→7.5.8, next 16.2.4→16.2.6) and **NOT** a Next 16.2.6 peer incompatibility. The Dependabot runs only fail because main itself is already broken — they inherit the regression.

**Primary cause**: `chore(brand-config)` and `chore(deps)` runs fail because the **previously merged** PR #231 (`feat(security): rate-limit on 18 more user-driven LLM routes (RA-3024 batch 2)`, merged 2026-05-12) added calls to `withRateLimit(...)` in 16 API route files **without adding the corresponding import**. The `tsc --noEmit` type-check step produces 16× `TS2304: Cannot find name 'withRateLimit'` errors and exits 2.

**Why this slipped through PR #231 merge**: `next.config.mjs` carries `typescript.ignoreBuildErrors: true` (SYN-877 workaround), and the merge-time CI gate was non-blocking for type-check on that PR. After merge, the regression became visible on every subsequent push.

**Secondary cause** (1 failing unit test): `__tests__/remotion/brand-registry.test.ts` was not updated when PR #233 (`feat(brand-config): re-codify RA palette to navy/warm/light`, 2026-05-14) changed `BrandConfig.colour.primary` for `restore-assist` from `#E55A2B` to `#1C2E47`. The parity test still expects `#E55A2B`.

## ROOT CAUSE Classification

| Class | Status | Cause |
|---|---|---|
| (a) flake / retry succeeds | NO | Deterministic — same TS error every run |
| (b) genuine code regression | **YES — PRIMARY** | PR #231 shipped without import statements |
| (c) dependency incompatibility (Next 16.2.6 peer) | NO | Dependabot runs fail at the same TS step, not on Next |
| (d) missing secret in CI environment | NO | Errors are pre-runtime |
| (e) test timeout | NO | tsc exits in ~70s, test in 47s |
| (f) Prisma migration drift | NO | Prisma generate succeeds |
| (g) genuine code regression (test not kept in sync with source) | **YES — SECONDARY** | RA palette change broke brand-registry parity test |

**Primary**: (b) — type-check failure on `withRateLimit`.
**Secondary**: (g) — brand-registry test parity drift.

## Reproduction

```bash
cd /Users/phill-mac/Synthex
git checkout main
git pull origin main
npm install
npm run type-check
# Expected: exits 2 with 16x TS2304 errors on withRateLimit
npm test -- __tests__/remotion/brand-registry.test.ts
# Expected: 1 failed — restore-assist expects #E55A2B, received #1C2E47
```

## One-File Fix Plan (DO NOT EXECUTE)

**The fix is already on PR #241** (`chore/synthex-phase2-hygiene-fix`, opened 2026-05-15 22:56 UTC, mergeable, Type Check passing). Merging PR #241 resolves the primary cause.

### Primary fix (PR #241 — already prepared)

- 16 files under `app/api/**/route.ts` — add `import { withRateLimit } from '@/lib/rate-limit/rate-limiter';` (or extend the existing `@/lib/rate-limit` barrel import in `app/api/demo/caption/route.ts`).
- `next.config.mjs` — remove `typescript.ignoreBuildErrors: true` to make type-check a real merge-blocking gate going forward.

### Secondary fix (NOT in PR #241 — separate small PR needed)

- File: `__tests__/remotion/brand-registry.test.ts`, line ~92.
- Change: `['restore-assist', '#E55A2B'],` → `['restore-assist', '#1C2E47'],`.
- Also update the matching entry in `lib/brand-content.ts` if `BRAND_CONTENT[restore-assist].brandColour` is still `#E55A2B` — the test asserts parity between BrandConfig and BRAND_CONTENT, so both must be in sync.
- Rationale: Wave 1 launch decision was navy `#1C2E47` per `/Users/phill-mac/RestoreAssist/CLAUDE.md` brand rules. The test was simply not updated when the BrandConfig changed.

## Risk Assessment

### Risk of merging PR #241 (primary fix)

- **Regression surface**: low. Pure additive imports + removal of an `ignoreBuildErrors` escape hatch. No runtime behaviour change.
- **Hidden risk**: removing `ignoreBuildErrors: true` will now surface any other latent TS errors at build time. PR #241 verification claims type-check exits 0 — trust but verify by watching Vercel build on first deploy after merge.
- **Rollback path**: trivial — revert PR #241.

### Risk of secondary fix (brand-registry test)

- **Regression surface**: zero — test-only change matching shipped source-of-truth.
- **Hidden risk**: if `lib/brand-content.ts` carries a different RA brandColour than `BrandConfig`, fixing only the test masks a real BrandContent drift. The fix should change both source and test together so the parity invariant remains a real guard.

## Whether This Blocks Phase 3

**YES** — this blocks Phase 3 (CCW productionisation).

The Deploy workflow fails on the same `tsc --noEmit` step as CI (see run 25944578386). Until PR #241 lands, **no deploy from `main` will reach Vercel production** — the Deploy job aborts before `vercel deploy`. CCW productionisation requires a clean production rail, which doesn't exist while main is red on every push.

The brand-registry test failure is unit-only and does not block deploy (deploy doesn't run unit tests in the same job), but it does keep CI red and contributes to alarm fatigue.

## Linked Failing Run URLs

- https://github.com/CleanExpo/Synthex/actions/runs/25944599697 — Dependabot protobufjs (2026-05-15)
- https://github.com/CleanExpo/Synthex/actions/runs/25944578386 — Deploy (next 16.2.6) (2026-05-15)
- https://github.com/CleanExpo/Synthex/actions/runs/25944578378 — CI (next 16.2.6) (2026-05-15)
- https://github.com/CleanExpo/Synthex/actions/runs/25887881724 — CI (brand-config PR4) (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25887881719 — Deploy (brand-config PR4) (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25884172729 — Dependabot next (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25883852030 — Dependabot protobufjs (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25882586406 — Deploy (RA palette) (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25882586356 — CI (RA palette) (2026-05-14)
- https://github.com/CleanExpo/Synthex/actions/runs/25810273837 — Dependabot protobufjs (2026-05-13)

## Open PR Carrying the Fix

- PR #241: https://github.com/CleanExpo/Synthex/pull/241 — `chore(hygiene): fix withRateLimit imports + remove SYN-877 typescript-skip workaround`
- State: OPEN, MERGEABLE, mergeStateStatus=UNSTABLE (some non-blocking checks still running)
- Type Check: PASS (verified 2026-05-16)
- Author: Phill (commit 9e3a6d7b, 2026-05-16 08:56 AEST)

## Decision Required

1. Merge PR #241 (resolves primary cause, unblocks Phase 3 deploy rail).
2. Open small follow-up PR for `__tests__/remotion/brand-registry.test.ts` parity + matching `lib/brand-content.ts` update.
3. Do NOT roll back Dependabot bumps — they were not the cause.

## Verification Ledger

- **DID**: Pulled 10 recent failed runs via `gh run list`; inspected `--log-failed` on three distinct failure clusters (next 16.2.6 push, brand-config PR4 push, RA palette push); confirmed each fails at `npm run type-check` step in CI workflow and at the same step in Deploy workflow; located missing import in 16 route files via `grep -L`; traced introduction to merged PR #231 via `git log --follow`; located prepared fix on branch `chore/synthex-phase2-hygiene-fix` (commit 9e3a6d7b) and confirmed it's open as PR #241 with Type Check passing.
- **VERIFIED**: 16 `TS2304: Cannot find name 'withRateLimit'` errors in run 25944578378 logs identical to errors in 25887881724 and 25882586356 — same regression on every push; 1 `__tests__/remotion/brand-registry.test.ts` failure expects `#E55A2B`, receives `#1C2E47` (RA palette change); Dependabot runs fail at the same TS step, ruling out a Next 16.2.6 peer-dep theory.
- **CHANGE-MY-MIND**: A 17th `withRateLimit` callsite exists somewhere that PR #241 missed (would surface as a new TS2304 error after merge); OR the `ignoreBuildErrors: true` removal in `next.config.mjs` exposes a second class of latent TS errors that PR #241's verification didn't catch (would surface on first Vercel deploy after merge); OR brand-content.ts already carries `#1C2E47` and the test was the only stale node, making the secondary fix one line instead of two.
