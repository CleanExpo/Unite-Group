# Runtime Reconciliation & Deployment Lifecycle — Design Spec

> Date: 2026-05-18
> Translates the Convex-flavoured "Runtime Reconciliation" plan onto this
> repo's actual substrate: Next.js App Router + Supabase + Vercel Fluid Compute.
> Companion to `docs/SOURCES.md` (cockpit map) and `scripts/unite` (CLI).

## 1. Problem

Each of the 9 integration cron routes under `src/app/api/cron/integrations/<svc>/route.ts`
duplicates the same runtime mechanics:

1. CRON_SECRET bearer auth (`timingSafeBearerMatch`)
2. Seed `integration_sync_state` row on first run
3. Write `last_sync_started_at` + status=`running`
4. Call the service-specific `sync<Service>()` function
5. Branch on result → write `ok` / `partial` / `error` + counts + next_sync_due_at
6. Shape the response JSON

The route file for 1Password is 75 lines; ~60 of those lines repeat in every other
integration. Adding a 10th integration today means copy-pasting that scaffolding
again, with no compiler help to prove the lifecycle is correct.

Domain policy lives mixed in: each route also knows the cadence (next_sync_due_at
offset), the "partial vs error" rule, and the response shape. That part is fine
to keep in the route — but it's hard to see when surrounded by mechanics.

## 2. Goal

Move the repeated lifecycle into one **runtime service module** so each cron
route handler is reduced to:

```ts
export const GET = withSyncLifecycle({
  integration: "onepassword",
  cadence: { hours: 24 },
  partialIfFailed: true,  // domain policy lives here
}, syncOnePassword);
```

The route stays responsible for auth gate (delegated to the wrapper),
identifying *which* integration this is, the cadence policy, and the
"what counts as partial vs error" rule. Everything else moves down a layer.

Non-goal: changing the cron schedule, the sync functions themselves, or the
`integration_sync_state` table shape. This is a pure refactor of the routing
layer.

## 3. Architecture

```
src/app/api/cron/integrations/<svc>/route.ts   ← thin, ~10 lines each
              │ calls
              ▼
src/lib/runtime/sync-lifecycle.ts              ← NEW — the wrapper
              │ orchestrates
              ▼
  ┌───────────────────────────────────────────────┐
  │  auth check (timing-safe)                     │
  │  state-seed → state-running                   │
  │  sync<Service>()                              │
  │  state-completed (ok|partial|error)           │
  │  response shape                               │
  └───────────────────────────────────────────────┘
                 │ persistence via
                 ▼
src/lib/runtime/sync-state-repo.ts              ← NEW — DB writes only
                 │
                 ▼
       integration_sync_state (Supabase)

src/lib/integrations/<svc>/sync.ts              ← unchanged, returns
                                                  { rowsUpserted, succeeded, failed }
```

## 4. Module contracts

### 4.1 `src/lib/runtime/sync-lifecycle.ts`

```ts
type SyncResult = {
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ key: string; error: string }>;
};

type SyncLifecycleConfig = {
  integration: string;             // matches integration_sync_state.integration
  cadence: { minutes?: number; hours?: number };  // for next_sync_due_at
  partialIfFailed?: boolean;       // if false, any failure → error status
};

export function withSyncLifecycle(
  cfg: SyncLifecycleConfig,
  sync: () => Promise<SyncResult>,
): (req: Request) => Promise<NextResponse>;
```

Returns a route handler. On invocation:

1. Verify `Authorization: Bearer $CRON_SECRET` via `timingSafeBearerMatch`. 401 if not.
2. Call `seedRow(cfg.integration)` then `markRunning(cfg.integration)`.
3. Call `sync()` inside a try.
4. On success: classify status (`ok` if no failures, `partial` if some + `partialIfFailed`, else `error`), persist via `markCompleted(...)`, return `NextResponse.json({ ok: true, ...result })`.
5. On thrown error: persist `markErrored(integration, err)`, return 500.

### 4.2 `src/lib/runtime/sync-state-repo.ts`

Pure persistence. No domain knowledge.

```ts
export async function seedRow(integration: string): Promise<void>;
export async function markRunning(integration: string): Promise<void>;
export async function markCompleted(
  integration: string,
  result: SyncResult,
  status: "ok" | "partial" | "error",
  nextDueAt: Date,
): Promise<void>;
export async function markErrored(integration: string, err: unknown): Promise<void>;
```

Each function calls `getAdminClient()` and writes to `integration_sync_state`.
The cron route never touches Supabase directly.

### 4.3 Route handler shape (after)

```ts
// src/app/api/cron/integrations/onepassword/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncOnePassword } from "@/lib/integrations/onepassword/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withSyncLifecycle(
  { integration: "onepassword", cadence: { hours: 24 }, partialIfFailed: true },
  syncOnePassword,
);
```

That's the whole file. ~70 lines → ~10 lines per integration.

## 5. Deployment lifecycle helpers (Phase 2 — separate spec)

The plan also references "dispatcher runtime setup, memory runtime setup,
validation, readiness, restart, and teardown helpers." This repo does not
currently have dispatcher/memory runtimes — those are a Convex concept. The
analogue here is:

- `validation` → `src/lib/runtime/preflight.ts` (run `scripts/pre-build-check.ts` + env-var sanity)
- `readiness` → existing `/api/health` route (already covers DB ping)
- `teardown` → none needed; Vercel Fluid Compute handles graceful shutdown

These are intentionally out of scope for this design. If we add them, they get
their own spec — not bundled here.

## 6. Migration plan

One PR, one integration at a time, to keep the diff reviewable:

1. **PR 1** — Add `src/lib/runtime/sync-lifecycle.ts` + `sync-state-repo.ts` with unit tests against a sandbox Supabase project. No route changes yet.
2. **PR 2** — Migrate `onepassword` route to `withSyncLifecycle`. Verify on sandbox first via manual GET with bearer.
3. **PRs 3-10** — Same migration, one integration per PR. Each PR ≤ 50 LoC diff.
4. **PR 11** — Delete dead imports (`getAdminClient` from routes, etc.) once all migrated.

## 7. Testing

- Unit: `sync-state-repo` against sandbox project (`xgqwfwqumliuguzhshwv`).
- Integration: hit each migrated route with a fake `CRON_SECRET` + stubbed sync function; assert four DB writes in order (seed, running, completed) and correct status classification.
- Manual prod verification: after each PR ships, watch the matching `integration_sync_state` row update on the next cron tick (5-60 min depending on cadence).

## 8. Rollback

Per-PR. Each migration is independent. If `withSyncLifecycle` itself proves wrong, revert PR 2-10 in reverse order; PR 1 (the new modules) can stay unused without consequence.

## 9. Non-goals (explicit)

- No new integrations.
- No change to `integration_sync_state` schema.
- No change to sync function signatures.
- No change to cron schedules in `vercel.json`.
- No Convex.
- No dispatcher/memory runtimes.

## 10. Open questions

None — the surface is small enough to lock now. Implementation plan to follow via `superpowers:writing-plans`.
