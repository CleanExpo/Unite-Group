# Runtime Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the repeated cron-route lifecycle (auth, sync-state writes, status classification) into `src/lib/runtime/sync-lifecycle.ts` so each integration route shrinks from ~70 lines to ~10.

**Architecture:** One reusable wrapper `withSyncLifecycle<F>(cfg, sync)` that returns a Next.js GET handler. The wrapper delegates DB writes to `sync-state-repo.ts` (pure persistence) and accepts a per-route `formatFailure: (f: F) => string` to keep existing per-integration failure-row shapes (`{repo}`, `{vault}`, `{entity}`, `{project}`, `{projectId}`) untouched. Each route migration is one PR.

**Tech Stack:** Next.js App Router (Node.js runtime), Supabase service-role client, ts-jest, existing `timingSafeBearerMatch` from `src/lib/security/safe-compare.ts`.

---

## File Structure

**Create:**
- `src/lib/runtime/types.ts` — `SyncResult<F>` + `SyncStatus` + `SyncLifecycleConfig<F>` types
- `src/lib/runtime/sync-state-repo.ts` — pure persistence; 4 functions, no domain knowledge
- `src/lib/runtime/sync-lifecycle.ts` — the `withSyncLifecycle` wrapper
- `tests/runtime/sync-state-repo.test.ts` — unit tests, Supabase client mocked
- `tests/runtime/sync-lifecycle.test.ts` — unit tests, repo + sync fn mocked

**Modify (one per migration PR):**
- `src/app/api/cron/integrations/<svc>/route.ts` — replace 70-line GET with `withSyncLifecycle(...)` call. Nine routes: composio, digitalocean, github, linear, onepassword, railway, stripe, supabase, vercel.

**Delete (Task 12):**
- Stale imports of `getAdminClient` and `timingSafeBearerMatch` from migrated routes.

Cadence map (for `cadenceMs` arg per route — copied from existing routes):

| Integration | Cadence | maxDuration |
|---|---|---|
| github | 5 min | 300s |
| vercel | 5 min | 60s |
| railway | 5 min | 60s |
| linear | 5 min | 60s |
| digitalocean | 15 min | 300s |
| stripe | 15 min | 60s |
| supabase | 60 min | 60s |
| composio | 60 min | 60s |
| onepassword | 24 h | 60s |

---

### Task 1: Add shared runtime types

**Files:**
- Create: `src/lib/runtime/types.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/lib/runtime/types.ts
export type SyncStatus = "ok" | "partial" | "error";

export type SyncResult<F = Record<string, unknown>> = {
  rowsUpserted: number;
  succeeded: string[];
  failed: F[];
};

export type SyncLifecycleConfig<F = Record<string, unknown>> = {
  integration: string;
  cadenceMs: number;
  partialIfFailed?: boolean;
  formatFailure: (f: F) => string;
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/runtime/types.ts
git commit -m "feat(runtime): add SyncResult + SyncLifecycleConfig types"
```

---

### Task 2: Add sync-state-repo with tests

**Files:**
- Create: `src/lib/runtime/sync-state-repo.ts`
- Test: `tests/runtime/sync-state-repo.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/runtime/sync-state-repo.test.ts
import {
  seedRow,
  markRunning,
  markCompleted,
  markErrored,
} from "@/lib/runtime/sync-state-repo";
import type { SyncResult } from "@/lib/runtime/types";

const upsertMock = jest.fn().mockResolvedValue({ error: null });
const updateMock = jest.fn().mockReturnThis();
const eqMock = jest.fn().mockResolvedValue({ error: null });
const fromMock = jest.fn(() => ({
  upsert: upsertMock,
  update: updateMock,
  eq: eqMock,
}));

jest.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

beforeEach(() => {
  upsertMock.mockClear();
  updateMock.mockClear();
  eqMock.mockClear();
  fromMock.mockClear();
});

test("seedRow upserts with ignoreDuplicates", async () => {
  await seedRow("github");
  expect(fromMock).toHaveBeenCalledWith("integration_sync_state");
  expect(upsertMock).toHaveBeenCalledWith(
    { integration: "github" },
    { onConflict: "integration", ignoreDuplicates: true },
  );
});

test("markRunning sets started_at + status=running", async () => {
  await markRunning("github");
  const payload = updateMock.mock.calls[0][0];
  expect(payload.last_sync_status).toBe("running");
  expect(typeof payload.last_sync_started_at).toBe("string");
  expect(eqMock).toHaveBeenCalledWith("integration", "github");
});

test("markCompleted writes status, counts, next_sync_due_at, error string", async () => {
  const result: SyncResult<{ key: string; error: string }> = {
    rowsUpserted: 12,
    succeeded: ["a", "b"],
    failed: [{ key: "c", error: "boom" }],
  };
  const nextDue = new Date("2026-05-18T10:00:00Z");
  await markCompleted("github", result, "partial", nextDue, "c: boom");
  const payload = updateMock.mock.calls[0][0];
  expect(payload.last_sync_status).toBe("partial");
  expect(payload.rows_upserted).toBe(12);
  expect(payload.last_sync_error).toBe("c: boom");
  expect(payload.next_sync_due_at).toBe(nextDue.toISOString());
});

test("markCompleted writes null error when status=ok", async () => {
  const result: SyncResult = { rowsUpserted: 1, succeeded: ["a"], failed: [] };
  await markCompleted("github", result, "ok", new Date(), null);
  const payload = updateMock.mock.calls[0][0];
  expect(payload.last_sync_error).toBeNull();
});

test("markErrored writes status=error + stringified message", async () => {
  await markErrored("github", new Error("bad token"));
  const payload = updateMock.mock.calls[0][0];
  expect(payload.last_sync_status).toBe("error");
  expect(payload.last_sync_error).toBe("bad token");
});

test("markErrored stringifies non-Error throwables", async () => {
  await markErrored("github", "raw string");
  const payload = updateMock.mock.calls[0][0];
  expect(payload.last_sync_error).toBe("raw string");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/runtime/sync-state-repo.test.ts`
Expected: FAIL with "Cannot find module '@/lib/runtime/sync-state-repo'"

- [ ] **Step 3: Implement sync-state-repo**

```ts
// src/lib/runtime/sync-state-repo.ts
import { getAdminClient } from "@/lib/supabase/admin";
import type { SyncResult, SyncStatus } from "@/lib/runtime/types";

const TABLE = "integration_sync_state";

export async function seedRow(integration: string): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .upsert(
      { integration },
      { onConflict: "integration", ignoreDuplicates: true },
    );
}

export async function markRunning(integration: string): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_started_at: new Date().toISOString(),
      last_sync_status: "running",
    })
    .eq("integration", integration);
}

export async function markCompleted<F>(
  integration: string,
  result: SyncResult<F>,
  status: SyncStatus,
  nextDueAt: Date,
  errorString: string | null,
): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: status,
      rows_upserted: result.rowsUpserted,
      last_sync_error: errorString,
      next_sync_due_at: nextDueAt.toISOString(),
    })
    .eq("integration", integration);
}

export async function markErrored(
  integration: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_error: message,
    })
    .eq("integration", integration);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/runtime/sync-state-repo.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/runtime/sync-state-repo.ts tests/runtime/sync-state-repo.test.ts
git commit -m "feat(runtime): add sync-state-repo with unit tests"
```

---

### Task 3: Add withSyncLifecycle wrapper with tests

**Files:**
- Create: `src/lib/runtime/sync-lifecycle.ts`
- Test: `tests/runtime/sync-lifecycle.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/runtime/sync-lifecycle.test.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import type { SyncResult } from "@/lib/runtime/types";

const seedRow = jest.fn().mockResolvedValue(undefined);
const markRunning = jest.fn().mockResolvedValue(undefined);
const markCompleted = jest.fn().mockResolvedValue(undefined);
const markErrored = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/runtime/sync-state-repo", () => ({
  seedRow: (...a: unknown[]) => seedRow(...a),
  markRunning: (...a: unknown[]) => markRunning(...a),
  markCompleted: (...a: unknown[]) => markCompleted(...a),
  markErrored: (...a: unknown[]) => markErrored(...a),
}));

const SECRET = "test-secret";
beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  seedRow.mockClear();
  markRunning.mockClear();
  markCompleted.mockClear();
  markErrored.mockClear();
});

function makeReq(auth: string | null): Request {
  return new Request("https://x/api/cron/integrations/github", {
    headers: auth ? { authorization: auth } : {},
  });
}

type F = { key: string; error: string };
const baseCfg = {
  integration: "github",
  cadenceMs: 5 * 60_000,
  formatFailure: (f: F) => `${f.key}: ${f.error}`,
};

test("returns 401 when bearer is missing", async () => {
  const handler = withSyncLifecycle<F>(baseCfg, async () => ({
    rowsUpserted: 0,
    succeeded: [],
    failed: [],
  }));
  const res = await handler(makeReq(null));
  expect(res.status).toBe(401);
  expect(seedRow).not.toHaveBeenCalled();
});

test("returns 401 when bearer is wrong", async () => {
  const handler = withSyncLifecycle<F>(baseCfg, async () => ({
    rowsUpserted: 0,
    succeeded: [],
    failed: [],
  }));
  const res = await handler(makeReq("Bearer wrong"));
  expect(res.status).toBe(401);
});

test("happy path → status=ok, error string null", async () => {
  const handler = withSyncLifecycle<F>(baseCfg, async () => ({
    rowsUpserted: 5,
    succeeded: ["a"],
    failed: [],
  }));
  const res = await handler(makeReq(`Bearer ${SECRET}`));
  expect(res.status).toBe(200);
  expect(seedRow).toHaveBeenCalledWith("github");
  expect(markRunning).toHaveBeenCalledWith("github");
  const completedArgs = markCompleted.mock.calls[0];
  expect(completedArgs[2]).toBe("ok");
  expect(completedArgs[4]).toBeNull();
});

test("partial path → status=partial, error string joined", async () => {
  const handler = withSyncLifecycle<F>(
    { ...baseCfg, partialIfFailed: true },
    async () => ({
      rowsUpserted: 5,
      succeeded: ["a"],
      failed: [
        { key: "b", error: "x" },
        { key: "c", error: "y" },
      ],
    }),
  );
  const res = await handler(makeReq(`Bearer ${SECRET}`));
  expect(res.status).toBe(200);
  const completedArgs = markCompleted.mock.calls[0];
  expect(completedArgs[2]).toBe("partial");
  expect(completedArgs[4]).toBe("b: x; c: y");
});

test("failures + partialIfFailed=false → status=error", async () => {
  const handler = withSyncLifecycle<F>(
    { ...baseCfg, partialIfFailed: false },
    async () => ({
      rowsUpserted: 0,
      succeeded: [],
      failed: [{ key: "b", error: "x" }],
    }),
  );
  const res = await handler(makeReq(`Bearer ${SECRET}`));
  expect(res.status).toBe(200);
  expect(markCompleted.mock.calls[0][2]).toBe("error");
});

test("thrown error → 500 + markErrored", async () => {
  const handler = withSyncLifecycle<F>(baseCfg, async () => {
    throw new Error("boom");
  });
  const res = await handler(makeReq(`Bearer ${SECRET}`));
  expect(res.status).toBe(500);
  expect(markErrored).toHaveBeenCalledWith("github", expect.any(Error));
  expect(markCompleted).not.toHaveBeenCalled();
});

test("next_sync_due_at uses cadenceMs", async () => {
  const handler = withSyncLifecycle<F>(
    { ...baseCfg, cadenceMs: 60_000 },
    async () => ({ rowsUpserted: 0, succeeded: [], failed: [] }),
  );
  const before = Date.now();
  await handler(makeReq(`Bearer ${SECRET}`));
  const nextDue = markCompleted.mock.calls[0][3] as Date;
  expect(nextDue.getTime()).toBeGreaterThanOrEqual(before + 60_000);
  expect(nextDue.getTime()).toBeLessThanOrEqual(before + 60_000 + 5_000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/runtime/sync-lifecycle.test.ts`
Expected: FAIL with "Cannot find module '@/lib/runtime/sync-lifecycle'"

- [ ] **Step 3: Implement the wrapper**

```ts
// src/lib/runtime/sync-lifecycle.ts
import { NextResponse } from "next/server";
import { timingSafeBearerMatch } from "@/lib/security/safe-compare";
import {
  seedRow,
  markRunning,
  markCompleted,
  markErrored,
} from "@/lib/runtime/sync-state-repo";
import type {
  SyncResult,
  SyncStatus,
  SyncLifecycleConfig,
} from "@/lib/runtime/types";

export function withSyncLifecycle<F = Record<string, unknown>>(
  cfg: SyncLifecycleConfig<F>,
  sync: () => Promise<SyncResult<F>>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    const auth = req.headers.get("authorization");
    if (!timingSafeBearerMatch(auth, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await seedRow(cfg.integration);
    await markRunning(cfg.integration);

    try {
      const result = await sync();
      const hasFailures = result.failed.length > 0;
      const status: SyncStatus = hasFailures
        ? cfg.partialIfFailed === false
          ? "error"
          : "partial"
        : "ok";
      const errorString = hasFailures
        ? result.failed.map(cfg.formatFailure).join("; ")
        : null;
      const nextDueAt = new Date(Date.now() + cfg.cadenceMs);
      await markCompleted(cfg.integration, result, status, nextDueAt, errorString);
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      await markErrored(cfg.integration, err);
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/runtime/sync-lifecycle.test.ts`
Expected: 7 tests PASS.

- [ ] **Step 5: Run the full suite to catch regressions**

Run: `npx jest tests/runtime/`
Expected: all 13 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/runtime/sync-lifecycle.ts tests/runtime/sync-lifecycle.test.ts
git commit -m "feat(runtime): add withSyncLifecycle wrapper with unit tests"
```

---

### Task 4: Migrate github route

**Files:**
- Modify: `src/app/api/cron/integrations/github/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/github/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncGitHub } from "@/lib/integrations/github/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type GitHubFailure = { repo: string; error: string };

export const GET = withSyncLifecycle<GitHubFailure>(
  {
    integration: "github",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.repo}: ${f.error}`,
  },
  syncGitHub,
);
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Verify unit tests still pass**

Run: `npx jest tests/runtime/`
Expected: 13 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/integrations/github/route.ts
git commit -m "refactor(integrations): migrate github route to withSyncLifecycle"
```

---

### Task 5: Migrate vercel route

**Files:**
- Modify: `src/app/api/cron/integrations/vercel/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/vercel/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncVercel } from "@/lib/integrations/vercel/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type VercelFailure = { project: string; error: string };

export const GET = withSyncLifecycle<VercelFailure>(
  {
    integration: "vercel",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.project}: ${f.error}`,
  },
  syncVercel,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/vercel/route.ts
git commit -m "refactor(integrations): migrate vercel route to withSyncLifecycle"
```

---

### Task 6: Migrate railway route

**Files:**
- Modify: `src/app/api/cron/integrations/railway/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/railway/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncRailway } from "@/lib/integrations/railway/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type RailwayFailure = { projectId: string; error: string };

export const GET = withSyncLifecycle<RailwayFailure>(
  {
    integration: "railway",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.projectId}: ${f.error}`,
  },
  syncRailway,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/railway/route.ts
git commit -m "refactor(integrations): migrate railway route to withSyncLifecycle"
```

---

### Task 7: Migrate linear route

**Files:**
- Modify: `src/app/api/cron/integrations/linear/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/linear/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncLinear } from "@/lib/integrations/linear/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type LinearFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<LinearFailure>(
  {
    integration: "linear",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncLinear,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/linear/route.ts
git commit -m "refactor(integrations): migrate linear route to withSyncLifecycle"
```

---

### Task 8: Migrate digitalocean route

**Files:**
- Modify: `src/app/api/cron/integrations/digitalocean/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/digitalocean/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncDigitalOcean } from "@/lib/integrations/digitalocean/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type DOFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<DOFailure>(
  {
    integration: "digitalocean",
    cadenceMs: 15 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncDigitalOcean,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/digitalocean/route.ts
git commit -m "refactor(integrations): migrate digitalocean route to withSyncLifecycle"
```

---

### Task 9: Migrate stripe route

**Files:**
- Modify: `src/app/api/cron/integrations/stripe/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/stripe/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncStripe } from "@/lib/integrations/stripe/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type StripeFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<StripeFailure>(
  {
    integration: "stripe",
    cadenceMs: 15 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncStripe,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/stripe/route.ts
git commit -m "refactor(integrations): migrate stripe route to withSyncLifecycle"
```

---

### Task 10: Migrate supabase route

**Files:**
- Modify: `src/app/api/cron/integrations/supabase/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/supabase/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncSupabase } from "@/lib/integrations/supabase/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type SupabaseFailure = { project: string; error: string };

export const GET = withSyncLifecycle<SupabaseFailure>(
  {
    integration: "supabase",
    cadenceMs: 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.project}: ${f.error}`,
  },
  syncSupabase,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/supabase/route.ts
git commit -m "refactor(integrations): migrate supabase route to withSyncLifecycle"
```

---

### Task 11: Migrate composio route

**Files:**
- Modify: `src/app/api/cron/integrations/composio/route.ts`

- [ ] **Step 1: Replace the whole route file**

```ts
// src/app/api/cron/integrations/composio/route.ts
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncComposio } from "@/lib/integrations/composio/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type ComposioFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<ComposioFailure>(
  {
    integration: "composio",
    cadenceMs: 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncComposio,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/composio/route.ts
git commit -m "refactor(integrations): migrate composio route to withSyncLifecycle"
```

---

### Task 12: Migrate onepassword route

**Files:**
- Modify: `src/app/api/cron/integrations/onepassword/route.ts`

**Note:** This route is *not* registered in `vercel.json` — it runs manually via Hermes cron from the Mac mini. The migration still applies; only the lifecycle changes, not who calls it. Keep the existing top-of-file comment block about the Hermes cron arrangement.

- [ ] **Step 1: Replace the whole route file (preserving the Hermes comment)**

```ts
// src/app/api/cron/integrations/onepassword/route.ts
//
// NOTE: this route is NOT registered in vercel.json. The 1Password sync
// uses the `op` CLI which doesn't exist in Vercel serverless. It runs
// instead from a Hermes cron on the Mac mini (where `op` is installed).
// Follow-up: /Users/phill-mac/Pi-CEO/scripts/sync_1password_to_supabase.py + Hermes cron
// "Unite-Group 1Password sync" at daily 04:00 AEST.
//
// This route is kept so the 1Password Connect path (when OP_CONNECT_HOST
// + OP_CONNECT_TOKEN are configured) can be triggered manually via
// authenticated POST. It will not auto-fire from Vercel.
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncOnePassword } from "@/lib/integrations/onepassword/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type OnePasswordFailure = { vault: string; error: string };

export const GET = withSyncLifecycle<OnePasswordFailure>(
  {
    integration: "onepassword",
    cadenceMs: 24 * 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.vault}: ${f.error}`,
  },
  syncOnePassword,
);
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integrations/onepassword/route.ts
git commit -m "refactor(integrations): migrate onepassword route to withSyncLifecycle"
```

---

### Task 13: Verify no stale imports remain + full smoke

**Files:**
- Search-and-verify only; no code changes expected.

- [ ] **Step 1: Confirm no route still imports the old helpers**

Run:
```bash
grep -rn "getAdminClient\|timingSafeBearerMatch" \
  src/app/api/cron/integrations/
```
Expected: zero matches (all 9 routes now import from `@/lib/runtime/sync-lifecycle` only).

- [ ] **Step 2: Confirm no route still touches integration_sync_state directly**

Run:
```bash
grep -rn "integration_sync_state" src/app/api/cron/integrations/
```
Expected: zero matches.

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: all tests PASS (or at minimum, the `tests/runtime/*` and `tests/integrations/*` suites pass; pre-existing failures unrelated to runtime/* are out of scope).

- [ ] **Step 4: Type-check the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Production smoke (after PR ships to preview)**

For each migrated integration, after the preview deploy goes live, hit:
```
curl -H "authorization: Bearer $CRON_SECRET" \
  https://<preview-url>/api/cron/integrations/<svc>
```
Expected: HTTP 200 with `{ok: true, rowsUpserted, succeeded, failed}`. Then query Supabase:
```sql
SELECT integration, last_sync_status, last_sync_completed_at, rows_upserted
FROM integration_sync_state
WHERE integration = '<svc>'
ORDER BY last_sync_completed_at DESC LIMIT 1;
```
Expected: row updated within the last minute, status `ok` (or `partial` if upstream is misconfigured).

- [ ] **Step 6: Commit the closing tag (no code, just a marker)**

If any cleanup tweaks emerged during smoke, commit them. Otherwise this task is verification-only — no commit needed.

---

## Spec coverage check

| Spec section | Task(s) |
|---|---|
| §3 Architecture — wrapper + repo | 1, 2, 3 |
| §4.1 `withSyncLifecycle` contract | 3 |
| §4.2 `sync-state-repo` contract | 2 |
| §4.3 Route handler shape | 4–12 (one per integration) |
| §6 Migration plan (11 PRs) | 1+2+3 = PR 1; 4–12 = PRs 2–10; 13 = PR 11 |
| §7 Testing | 2 (repo unit), 3 (wrapper unit), 13 (smoke + type-check) |
| §8 Rollback | covered by per-task commits; revert individual commits |
| §9 Non-goals | enforced by task scope (no schema changes, no sync.ts edits, no new integrations) |

## Notes for the executing agent

- **Generic `F` parameter** is the only refinement over the spec — needed because each integration's failure-row shape differs (`{repo}` / `{vault}` / `{entity}` / `{project}` / `{projectId}`). Each route supplies its own `formatFailure`.
- **Do not edit `src/lib/integrations/<svc>/sync.ts`** — sync function signatures are out of scope.
- **One commit per task.** Eleven PRs total in the spec; if shipping as one branch, each task commit is the unit of revert.
