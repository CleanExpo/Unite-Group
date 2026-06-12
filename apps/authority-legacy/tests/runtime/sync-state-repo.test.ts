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
