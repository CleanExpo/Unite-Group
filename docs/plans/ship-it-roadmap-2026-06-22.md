---
title: "Ship-it roadmap — apps/web to polished, fully-green production"
date: 2026-06-22
method: compound-engineering (brainstorm → plan → work → review → compound)
status: active
owner: phill
---

# Ship-it roadmap — apps/web

Driving the Nexus product (`apps/web`) to a polished, fully-green, tested,
ship-it state using the Compound Engineering loop
(github.com/mvanhorn/compound-engineering-plugin). Each work item below becomes
one focused branch → PR into `main` (which now merges green PRs hands-off; see
[`docs/solutions/integration-issues/pr-merge-loop-deadlock-on-required-reviews.md`](../solutions/integration-issues/pr-merge-loop-deadlock-on-required-reviews.md)).

## Current ground truth (verified 22/06/2026)

| Gate | State | Notes |
|---|---|---|
| `type-check` | ✅ PASS | clean |
| `test` (vitest) | ✅ PASS | 2276 tests / 380 files |
| `lint` | ✅ PASS | (was 1 red from abandoned Step-2 WIP — now resolved via PR #437) |
| `build` | ✅ (CI/Vercel) | local `npm run build` fails only on the `validate-env.mjs` env preflight; CI + Vercel deployments green |

**The app is already substantially green.** Founder routes are largely
NorthStar-compliant: 26/27 segments carry both `loading.tsx` + `error.tsx`, no
fake-as-real data, no swallowed errors. The remaining work is targeted, not a
rebuild.

## Work items (priority order)

### P0 — Integrity (financial-advice surface)

These are correctness/integrity gaps on the advisory feature, which produces
tax/financial strategy a human acts on. **Owned by the overnight scheduled task
`advisory-debate-overnight-buildspec`** (one step per run), per
[`docs/audit-reports/advisory-debate-qa-spec-2026-06-22.md`](../audit-reports/advisory-debate-qa-spec-2026-06-22.md):

- [x] **Step 1 — rate-limit-aware retry** (`retry-after` + jitter + raised 429 ceiling). PR #435, merged.
- [x] **Step 2 — bounded firm-concurrency pool** (`allSettledWithConcurrency`, cap 2). PR #437, open/green.
- [ ] **Step 3 — surface dropped firms.** `debate-engine.ts:197-217` swallows proposal/evidence insert failures (`console.error` + `continue`); judge then scores a partial set as complete. Add a `firm_dropped` `DebateEvent` (`types.ts`), record the degraded set, make the judge summary state "scored N of 4 firms", render the warning in `LiveDebateTab.tsx`.
- [ ] **Step 4 — atomic start claim.** `start/route.ts:35-40` is check-then-run (TOCTOU); two rapid POSTs can both start a debate. Replace with `UPDATE advisory_cases SET status='debating' WHERE id=? AND founder_id=? AND status='draft' RETURNING id` and only start if a row returns.
- [ ] **Step 5 — recover judge-incomplete cases.** A judge failure leaves `status='judged'` with no restart path. Accept `status IN ('draft','judged')` for restart, or add a re-judge action.

### P1 — Security / founder-scope hardening (verified)

Single-tenant today (one founder), so live blast radius is low, but these
violate the explicit-`founder_id`-scoping rule (defence-in-depth) and the cron
one can touch wrong rows if the table ever holds multiple founders:

- [ ] **`api/video/generate/route.ts:46-48`** — `brand_identities` SELECT scoped by `business_key` only. Add `.eq('founder_id', user.id)`. (HIGH)
- [ ] **`api/cron/video-status/route.ts:22`** — `video_assets` query in a service-client cron with no founder scope. Add `.eq('founder_id', process.env.FOUNDER_USER_ID)`. (MED, high blast radius)
- [ ] **`api/coaches/reports/route.ts:34-39`** — relies on RLS only; add explicit `.eq('founder_id', user.id)` for defence-in-depth. (MED)

### P2 — Polish / coverage

- [ ] **`/founder/nexus`** missing `loading.tsx` + `error.tsx` — the only founder segment lacking both. Add to match the 26 others. (HIGH-polish, ~15 min)
- [ ] **Advisory core test coverage** — `debate-engine.ts` `runDebate()` generator, `agents.ts`, `evidence-extractor.ts`, `structured-output.ts`, `financial-context.ts`, `session-memory.ts` have no unit tests. The F1–F5 failure paths live in `runDebate`. Add generator-level tests with a mocked Supabase + AI client. (MED)
- [ ] **Advisory UI tests** — `LiveDebateTab`, `HistoryTab`, `NewCaseTab`, `EvidenceTab` and `shared/` cards are untested. (LOW)

## Loop discipline

For each item: branch off `main` → TDD (red test first) → implement → `type-check`
+ `lint` + `test` green → PR → merges on green. On a non-trivial fix, run
`/ce:compound` to capture the lesson in `docs/solutions/` so the next occurrence
is a lookup, not a re-investigation.
