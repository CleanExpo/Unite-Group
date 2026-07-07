# Advisory Debate — Production-Readiness QA Build Spec

- **Date:** 22/06/2026 (original) · reconstructed as-built 08/07/2026
- **Surface:** `apps/web/src/lib/advisory/` — the AI "firms" debate engine that produces
  tax/financial strategy a human acts on. **P0 integrity work.**
- **Owner:** overnight scheduled task `advisory-debate-overnight-buildspec` (one step per run).
- **Referenced by:** [`docs/plans/ship-it-roadmap-2026-06-22.md`](../plans/ship-it-roadmap-2026-06-22.md)
  (P0 work items) and the Step-1/2/3/5 test files under
  `apps/web/src/lib/advisory/__tests__/`.

> **[VERIFIED] Provenance / honesty note.** The original `advisory-debate-qa-spec-2026-06-22.md`
> authored on 22/06/2026 drove this build, but it was **never committed** — it existed only
> in the working tree of the branch that did the work and was lost. Four tracked files still
> cite this path (`retry.test.ts:3`, `concurrency.test.ts:3`, `ship-it-roadmap-2026-06-22.md:38`,
> and `partial-debate.test.ts`), leaving a broken link.
>
> This document is an **as-built reconstruction**, not the recovered original. Every fix,
> constant, file path and acceptance criterion below was re-derived from the **merged
> implementation** on `main` (PRs #435, #437, #440) and the surviving tests — it is `[VERIFIED]`
> against code, not memory. The failure descriptions and root-cause line numbers in the
> "Problem" sub-sections are quoted from the roadmap's P0 block, which captured them at spec time.

---

## Context

The advisory feature runs a five-round debate between four AI "firms" (`FIRM_KEYS`), each
proposing a tax/financial strategy, followed by a Judge phase that scores the proposals and
produces a recommendation for founder review. It runs on the rate-limited Claude-Max account.

Five integrity gaps made the debate abort, silently degrade, or strand cases. Each is fixed
**one step per PR**, left open for human review (this is financial-advice code).

Failure-mode IDs (as they appear in the merged code/tests): **F1** rate-limit storm,
**F2** partial-debate integrity, **F3** double-start race, **F4** stranded-case recovery.

---

## Step 1 — Rate-limit-aware retry (F1)

**File:** `src/lib/advisory/debate-engine.ts` — `callWithRetry` backing
`callFirmAgentWithRetry` / `callJudgeAgentWithRetry`.

**Problem.** Fixed 1/2/4s exponential backoff on a shared rate-limited account meant all four
firms retried in lockstep and re-collided, producing a 429 storm that aborted round 1.

**Fix.**
- On HTTP 429, honour the API `retry-after` header (`getRetryAfterMs`) instead of the fixed
  backoff schedule.
- Add **full jitter** so concurrent firms desynchronise (`retryAfterMs + random() * baseMs`;
  exponential full jitter when no header is present).
- Raise the **429 retry ceiling** above the generic-error ceiling.

**As-built constants** `[VERIFIED]`: `RETRY_BASE_MS = 1000`, `MAX_RETRIES = 3` (generic),
`RATE_LIMIT_MAX_RETRIES = 5` (429). `isRateLimitError` matches `e.status === 429` or
`/rate.?limit/i`. `random` is injectable for deterministic tests.

**Acceptance.** A 429 with `retry-after: N` waits ≈N s (+jitter), not the fixed schedule;
429s retry up to 5×; generic errors up to 3×; two firms hitting 429 at the same instant pick
different delays.

**Status:** ✅ merged — PR #435. Tests: `__tests__/retry.test.ts`.

---

## Step 2 — Bounded firm-concurrency pool (F1)

**File:** `src/lib/advisory/debate-engine.ts` round loop (~L133–158).

**Problem.** The round fan-out fired all four firms at once (`Promise.allSettled` over four
eager promises), guaranteeing a burst against the rate-limited account every round.

**Fix.** Replace the 4-wide fan-out with a small **async pool** — `allSettledWithConcurrency`,
no new dependency. Firms are built as **thunks** (not eager promises) so the pool, not the
event loop, decides when each fires. All firms still run per round; at most
`FIRM_CONCURRENCY` run at once, result order preserved. A `limit < 1` is clamped to 1 so the
pool can't deadlock.

**As-built constant** `[VERIFIED]`: `FIRM_CONCURRENCY = 2`.

**Acceptance.** Never more than 2 firm calls in flight simultaneously; all 4 results returned
in firm order; `allSettled` semantics preserved (one firm's rejection doesn't sink the round).

**Status:** ✅ merged — PR #437. Tests: `__tests__/concurrency.test.ts`.

---

## Step 3 — Surface dropped firms (F2)

**Files:** `src/lib/advisory/types.ts`, `debate-engine.ts` (~L194/213 insert paths),
`src/components/founder/advisory/tabs/LiveDebateTab.tsx`.

**Problem.** When a firm's proposal/evidence insert failed, the engine did `console.error` +
`continue` and carried on. The Judge then scored a **partial set as if complete** — a silent
integrity failure on financial-advice output.

**Fix.**
- Extend `DebateEvent` with `firm_dropped`:
  `{ event: 'firm_dropped'; round: number; firm: FirmKey; reason: string }` (`types.ts:246`).
- When a proposal **or** evidence insert fails, emit `firm_dropped` and **continue with the
  firms that did persist** — never present a degraded debate as complete.
- Record the degraded set on the case (`droppedFirms`, `scoredFirmCount`, `partial`) and tell
  the Judge: the summary MUST state **"scored N of 4 firms"** and must not present a partial
  debate as complete.
- `LiveDebateTab.tsx` renders a partial-debate warning, derived from either the persisted
  summary markers or live `firm_dropped` events, and is reset on case switch so warnings can't
  leak between cases.

**Acceptance.** A failed insert emits exactly one `firm_dropped` for that firm; the debate
finishes with the survivors; the Judge summary contains "scored N of 4 firms"; the UI shows the
degraded-set warning.

**Status:** ✅ merged — PR #440. Tests: `__tests__/partial-debate.test.ts`,
`components/.../__tests__/LiveDebateTab.partial.test.tsx`.

---

## Step 4 — Atomic start claim (F3)

**File:** `src/app/api/advisory/cases/[id]/start/route.ts`.

**Problem.** Check-then-run (TOCTOU): two rapid POSTs could both pass the `status='draft'`
check and start the debate twice.

**Fix.** Replace with a single conditional claim —
`UPDATE advisory_cases SET status='debating', current_round=0
WHERE id=? AND founder_id=? AND status='draft' RETURNING id` — via
`.update(...).eq('id').eq('founder_id').eq('status','draft').select('id').single()`. Only the
caller that wins the row proceeds; a losing (or non-draft / wrong-founder) caller gets no row
back and returns **409**. Founder scoping is on the same statement.

**Acceptance.** Two concurrent starts → exactly one debate starts, the other gets 409; a
non-draft or wrong-founder case never starts and returns 409.

**Status:** ✅ merged — PR #440. Tests: `components/.../__tests__/LiveDebateTab.start.test.tsx`
plus route-level coverage.

---

## Step 5 — Recover judge-incomplete cases (F4)

**Files:** `src/lib/advisory/debate-engine.ts` (`reJudgeCase`),
`src/app/api/advisory/cases/[id]/re-judge/route.ts`.

**Problem.** A Judge-phase failure parked the case at `status='judged'` with **no restart
path** — the five-round debate was done and persisted, but there was no way to finish scoring.

**Fix.** Add a **re-judge action** (`reJudgeCase` + `POST .../re-judge`) that re-runs **only**
the Judge phase from the persisted round-5 proposals — it does **not** re-run the 5-round
debate. Precondition `status='judged'` (enforced in `reJudgeCase` with founder scoping); on
success the case moves to `status='pending_review'` and the approval-queue entry is created.
Events are broadcast over Supabase Realtime.

**Acceptance.** A case at `status='judged'` can be re-judged from persisted proposals, ending
at `pending_review`; the debate rounds are not re-run; a case not at `judged` is rejected; the
re-judge is founder-scoped.

**Status:** ✅ merged — PR #440. Tests: `__tests__/re-judge.test.ts`,
`app/api/advisory/cases/[id]/re-judge/__tests__/route.test.ts`.

---

## Rollout summary (as-built)

| Step | Failure | Fix | PR | Tests |
|---|---|---|---|---|
| 1 | F1 — 429 storm | `retry-after` + full jitter + 429 ceiling 5 | #435 | `retry.test.ts` |
| 2 | F1 — burst fan-out | bounded pool `allSettledWithConcurrency`, cap 2 | #437 | `concurrency.test.ts` |
| 3 | F2 — silent partial debate | `firm_dropped` event + degraded set + "scored N of 4" + UI warning | #440 | `partial-debate.test.ts`, `LiveDebateTab.partial.test.tsx` |
| 4 | F3 — double-start race | atomic conditional-UPDATE claim → 409 on loss | #440 | `LiveDebateTab.start.test.tsx` |
| 5 | F4 — stranded at `judged` | `reJudgeCase` re-runs Judge phase only → `pending_review` | #440 | `re-judge.test.ts`, `re-judge/route.test.ts` |

**All five steps are merged into `main`.** This spec is committed after the fact to restore
the source-of-truth document the four in-tree references point at.

---

## Risk / assumption register

- `[UNCONFIRMED]` Exact prose of the 22/06/2026 original is unrecoverable; this reconstruction
  matches the shipped behaviour, which may differ in wording from the original's intent.
- `[VERIFIED]` All constants, file paths, event shapes, and status transitions above were read
  from the merged `main` implementation on 08/07/2026.
