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
