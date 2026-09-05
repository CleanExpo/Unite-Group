import { describe, expect, it, vi } from "vitest";
import {
  saveDelivery,
  hashDeliveryInput,
  deliveryFingerprint,
  type DeliveryStoreClient,
} from "../delivery-store";
import type { CommandCentreTask } from "../tasks";
import type { DeliveryMetadata } from "../delivery-types";

function fixture(): { task: CommandCentreTask; delivery: DeliveryMetadata } {
  const delivery: DeliveryMetadata = {
    schemaVersion: 1,
    kind: "software_delivery",
    lane: "software",
    revision: 1,
    inputHash: "a".repeat(64),
    originalIdea: "Build a portal",
    projectKey: "Unite-Group",
    presetIds: [],
    recipeVersions: {},
    answers: {},
    questions: [],
    phase: "captured",
    spec: null,
    specVersion: null,
    harness: [],
    sourceRefs: [],
    board: null,
    lease: null,
    approval: null,
    error: null,
    scope: "branch_preview_only",
  };
  const task: CommandCentreTask = {
    id: "task",
    founder_id: "owner",
    external_ref: "delivery:request",
    queue_id: null,
    project_id: null,
    project_key: null,
    title: "Portal",
    objective: "Build a portal",
    priority: "P2",
    status: "proposed",
    agent_owner: null,
    risk_level: "low",
    execution_mode: "branch-preview",
    origin: "idea",
    dependencies: [],
    human_approval_required: true,
    evidence_path: null,
    validation_required: [],
    linear_id: null,
    preview_url: null,
    metadata: { unrelated: { retained: true }, delivery },
    created_at: "2026-09-05T00:00:00.000Z",
    updated_at: "2026-09-05T00:00:00.000Z",
  };
  return { task, delivery };
}
function database(
  task: CommandCentreTask,
  options: { emptyWrite?: boolean; unconfirmed?: boolean } = {},
) {
  const filters: Array<[string, unknown]> = [];
  let row = structuredClone(task);
  const update = vi.fn((values: Record<string, unknown>) => {
    row = { ...row, ...values } as CommandCentreTask;
    // PostgreSQL JSONB returns semantically identical objects with a different key order.
    row.metadata.delivery = Object.fromEntries(
      Object.entries(row.metadata.delivery as object).reverse(),
    );
    const mutation = {
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return mutation;
      },
      select: async () => ({
        data: options.emptyWrite ? [] : [row],
        error: null,
      }),
    };
    return mutation;
  });
  const read = {
    eq: () => read,
    single: async () => ({
      data: options.unconfirmed ? null : row,
      error: null,
    }),
  };
  const client = {
    from: () => ({ update, select: () => read }),
  } as unknown as DeliveryStoreClient;
  return { client, filters, update };
}

describe("guarded delivery store", () => {
  it("confirms JSONB-reordered content and saves target with metadata atomically", async () => {
    const { task, delivery } = fixture();
    const db = database(task);
    const saved = await saveDelivery(task, delivery, { client: db.client });
    expect(saved.project_key).toBe("Unite-Group");
    expect(saved.metadata.unrelated).toEqual({ retained: true });
    expect(db.filters).toEqual(
      expect.arrayContaining([
        ["founder_id", "owner"],
        ["id", "task"],
        ["status", "proposed"],
        ["updated_at", task.updated_at],
        ["metadata->delivery->>revision", "1"],
      ]),
    );
    expect(hashDeliveryInput(saved.metadata.delivery)).toBe(
      hashDeliveryInput(delivery),
    );
  });
  it("refuses a lost CAS instead of overwriting newer mission state", async () => {
    const { task, delivery } = fixture();
    const db = database(task, { emptyWrite: true });
    await expect(
      saveDelivery(task, delivery, { client: db.client }),
    ).rejects.toThrow(/changed/);
  });
  it("does not return success when authoritative readback fails", async () => {
    const { task, delivery } = fixture();
    const db = database(task, { unconfirmed: true });
    await expect(
      saveDelivery(task, delivery, { client: db.client }),
    ).rejects.toThrow(/confirmed/);
  });
  it("rejects a stale lease before any update", async () => {
    const { task, delivery } = fixture();
    const db = database(task);
    await expect(
      saveDelivery(task, delivery, {
        expectedLease: "another-owner",
        client: db.client,
      }),
    ).rejects.toThrow(/ownership/);
    expect(db.update).not.toHaveBeenCalled();
  });
  it("fingerprints canonical material independent of object key order but sensitive to changed scope inputs", () => {
    const { delivery } = fixture();
    const reordered = Object.fromEntries(
      Object.entries(delivery).reverse(),
    ) as DeliveryMetadata;
    expect(deliveryFingerprint(reordered)).toBe(deliveryFingerprint(delivery));
    expect(
      deliveryFingerprint({ ...delivery, answers: { q1: "Changed customer" } }),
    ).not.toBe(deliveryFingerprint(delivery));
    expect(deliveryFingerprint({ ...delivery, projectKey: "Other" })).not.toBe(
      deliveryFingerprint(delivery),
    );
    expect(deliveryFingerprint({ ...delivery, revision: 2 })).not.toBe(
      deliveryFingerprint(delivery),
    );
  });
});
