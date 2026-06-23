# Signal Ingestion → Idea Intake — Design Proposal

**Status:** PROPOSAL — for Phill's review (not yet approved, not built).
**Date:** 23/06/2026
**Author:** autonomous loop (session 8bf75018)
**Companion specs:** `2026-06-23-idea-intake-routing-front-half-design.md` (idea →
clarify → classify → route), `2026-06-23-software-lane-design.md` +
`2026-06-23-content-lane-design.md` (lane execution).

---

## The problem (Phill's words)

> "I am still getting Telegram Messages … but there is no auto follow-up spec and
> build to production once these evidence issues, errors, enhancements, etc. are
> recognised. I want a full system that finds, researches, and builds through to
> production."

Today the **back half** of that loop already exists and is live:

```
idea → clarify → classify → lane (software | content) → gated execution → PR
```

…driven by the `IdeaConsole` UI, which `POST`s to
`/api/command-centre/ideas` → `createTask({ origin: 'idea', status: 'proposed' })`.

What's missing is the **front half**: nothing turns an inbound *signal* (a
Telegram message, a cron's error/evidence row, a failing health check) into one
of those `proposed` tasks automatically. The loop only starts when Phill hand-types
an idea.

This design adds that bridge — **and only that bridge.** It deliberately reuses
the existing intake + pipeline rather than building a parallel system.

---

## What is already verified (so we build on it, not beside it)

| Surface | Status | File |
|---|---|---|
| Task intake | LIVE | `src/lib/command-centre/tasks.ts` → `createTask` (origins `idea \| board-review \| blocker \| self-improvement`; default status `proposed`) |
| Evidence brief | LIVE | `addEvidenceRecord` + `writeEvidence` (Obsidian/wiki) |
| Idea intake route | LIVE | `src/app/api/command-centre/ideas/route.ts` |
| Clarify→classify→route | LIVE | idea-intake front-half spec, `/api/command-centre/clarify`, `/classify` |
| Lanes (execution) | LIVE | `/api/command-centre/lanes/{software,content}/*` |
| Telegram **feed** read | **`not_connected`** | `src/app/api/telegram/feed/route.ts` — `telegram_messages` table is NOT migrated into apps/web; route honestly returns empty |

**The load-bearing unknown:** the Telegram feed is `not_connected` because the
`telegram_messages` table doesn't exist in apps/web's DB. So before any auto-loop
can read signals, we have to decide **where signals physically arrive**. That is
the one decision this proposal cannot make for Phill (see "Open decision" below).

---

## Proposed architecture (the part that is certain)

A single, small ingestion seam — three pure units + one route:

```
inbound signal ──▶ normaliser ──▶ dedup gate ──▶ createTask(origin:'signal', 'proposed')
   (transport)      (pure fn)      (pure fn)         │
                                                     └──▶ existing clarify→classify→lane loop
```

1. **`SignalEnvelope` (type)** — the normalised shape every transport maps onto:
   `{ source: 'telegram' | 'cron' | 'health' | 'error', externalRef, text, observedAt, severity?, projectKey? }`.
   `externalRef` is the transport's own id (message id, cron run id) — the dedup key.

2. **`normaliseSignal(raw, source) → SignalEnvelope`** — pure, per-source. Strips
   noise, derives a concise title (reuse `ideas/route.ts` `deriveTitle`), classifies
   severity. No I/O. Fully unit-testable.

3. **`shouldIngest(envelope, recentRefs) → boolean`** — pure dedup/relevance gate.
   Drops anything whose `externalRef` was already ingested, plus obvious noise
   (bot echoes, heartbeat pings). No I/O.

4. **`POST /api/command-centre/signals/ingest`** — thin route: auth (founder
   session **or** `CRON_SECRET` for machine callers, per the API CLAUDE.md cron
   pattern), parse → `normaliseSignal` → `shouldIngest` → `createTask` +
   `addEvidenceRecord` + `appendTaskEvent('created', source)`. Founder-scoped.
   Returns the created task (or `{ skipped: reason }`).

**Crucially:** the task lands as **`proposed`**, exactly like a hand-typed idea.
Nothing auto-executes. The existing board/lane gates still apply. The friction
model Phill already approved is preserved end-to-end — this only removes the
manual *typing*, never the manual *approval*.

### New `TaskOrigin`
Add `'signal'` to `TaskOrigin` (currently `idea | board-review | blocker |
self-improvement`). One-line additive change; no migration if `origin` is a text
column (verify before building).

---

## Open decision (Phill's call — the transport)

The bridge above is transport-agnostic. **Where do signals actually originate?**
Three concrete options, with my recommendation:

- **Option A — Push from Hermes/the bot (recommended).** Whatever already receives
  Phill's Telegram messages (Hermes, or the Telegram bot infra outside apps/web)
  `POST`s each signal to `/signals/ingest` with `CRON_SECRET`. apps/web stores
  nothing new; it just receives. Lowest schema risk, no `telegram_messages`
  migration, clean boundary. **Best fit for the "no new tables" NorthStar rule.**

- **Option B — Migrate `telegram_messages` into apps/web + a cron poller.** A cron
  reads new rows and self-`POST`s to `/signals/ingest`. Self-contained, but needs
  a prod schema change (gated) and duplicates message storage.

- **Option C — Per-source cron evidence only (narrowest).** Skip Telegram for v1;
  wire only the existing crons' error/evidence output into `/signals/ingest`.
  Smallest, proves the loop, defers the Telegram question.

I recommend **A** (or **C** as a first slice), because both avoid a prod schema
change and respect "no speculative crons / no new tables for unconnected sources."
But this needs Phill's confirmation of *what currently receives the Telegram
messages* — I could not verify that from inside apps/web.

---

## Scope discipline (No-Invaders check)

- **No fake-as-real:** if a transport isn't wired, `/signals/ingest` simply isn't
  called — no synthetic signals. The Telegram feed already models this honesty.
- **No new parallel system:** reuses `createTask` + the existing pipeline.
- **No auto-execution:** signals become `proposed` tasks; all existing gates hold.
- **No prod schema change** under Option A/C.
- **No multi-tenant:** founder-scoped throughout.

## Testing

`normaliseSignal` and `shouldIngest` are pure → exhaustive unit tests (noise,
dedup, severity, title derivation). The route gets an auth test (401 unauth,
`CRON_SECRET` accepted) and a happy-path test (signal → proposed task) with the
store injected, matching the lanes' DI test style.

## Decomposition (once a transport is chosen)

1. `SignalEnvelope` + `normaliseSignal` + `shouldIngest` (pure, tested) — no risk.
2. `/api/command-centre/signals/ingest` route + `'signal'` origin — additive.
3. Wire the chosen transport (A: Hermes push / C: cron evidence) — the only part
   touching anything outside apps/web.

Steps 1–2 are safe to build the moment the design is approved. Step 3 waits on the
Option A/B/C decision.

---

## What I need from Phill

1. **Which transport** — A, B, or C?
2. For Option A: **what process currently receives your Telegram messages** (Hermes?
   a standalone bot?) so it can be the one to `POST` to `/signals/ingest`.

Until then this stays a proposal. Nothing is built.
