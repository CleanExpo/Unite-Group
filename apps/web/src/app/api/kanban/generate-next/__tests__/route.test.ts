import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({ getAIClient: vi.fn() }));
vi.mock("@/lib/command-centre/tasks", () => ({
  createTaskOnce: vi.fn(),
  appendTaskEvent: vi.fn(),
}));

import { getAIClient } from "@/lib/ai/client";
import {
  appendTaskEvent,
  createTaskOnce,
} from "@/lib/command-centre/tasks";
import { getUser } from "@/lib/supabase/server";
import { POST } from "../route";

const mockGetUser = vi.mocked(getUser);
const mockGetAIClient = vi.mocked(getAIClient);
const mockCreateTaskOnce = vi.mocked(createTaskOnce);
const mockAppendTaskEvent = vi.mocked(appendTaskEvent);

function modelReturning(tasks: unknown) {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: "text", text: JSON.stringify(tasks) }],
      })),
    },
  } as unknown as ReturnType<typeof getAIClient>;
}

function req(body: unknown) {
  return new Request("https://unite.test/api/kanban/generate-next", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function storedTask(id: string, title: string) {
  return {
    id,
    founder_id: "founder-1",
    title,
    status: "proposed",
  } as never;
}

describe("POST /api/kanban/generate-next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: "founder-1" } as never);
    mockCreateTaskOnce.mockImplementation(async (input) => ({
      task: storedTask(`task-${input.title}`, input.title),
      created: true,
    }));
    mockAppendTaskEvent.mockResolvedValue({ id: "event-1" } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it("does not generate or persist without founder authentication", async () => {
    mockGetUser.mockResolvedValue(null as never);

    const response = await POST(req({ column: "today" }));

    expect(response.status).toBe(401);
    expect(mockGetAIClient).not.toHaveBeenCalled();
    expect(mockCreateTaskOnce).not.toHaveBeenCalled();
  });

  it("persists generated work as proposed CRM tasks and appends an audit event", async () => {
    mockGetAIClient.mockReturnValue(
      modelReturning([
        {
          title: "Build the widget",
          context: "A small widget.",
          acceptance: ["renders", "has a test"],
        },
      ]),
    );

    const response = await POST(req({ column: "today" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateTaskOnce).toHaveBeenCalledTimes(1);
    const input = mockCreateTaskOnce.mock.calls[0][0];
    expect(input).toMatchObject({
      founderId: "founder-1",
      title: "Build the widget",
      projectKey: "unite-group",
      priority: "P2",
      status: "proposed",
      agentOwner: "Nexus",
      riskLevel: "medium",
      executionMode: "advisory",
      origin: "board-review",
      humanApprovalRequired: false,
      validationRequired: ["renders", "has a test"],
    });
    expect(input.externalRef).toMatch(/^generated-next:today:[0-9a-f]{64}$/);
    expect(input.objective).toContain("## Acceptance Criteria");
    expect(input.objective).toContain("- renders");
    expect(input.metadata).toMatchObject({
      nexusGeneratedNext: {
        schema: "crm.generated-next.v1",
        source: "founder-kanban-propose",
        column: "today",
      },
      tags: ["source:founder-kanban", "nexus-generated"],
    });
    expect(mockAppendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: "founder-1",
        type: "created",
        actor: "nexus",
        payload: {
          source: "founder-kanban-propose",
          column: "today",
          mode: "proposal-only",
        },
      }),
    );
    expect(payload).toMatchObject({
      source: "crm-cc_tasks",
      authority: "cc_tasks",
      mode: "crm-proposal-only",
      createdCount: 1,
      skippedExistingCount: 0,
      failedCount: 0,
      partial: false,
      linearCreated: 0,
      hermesCreated: 0,
      reviewPath: "/founder/command-centre",
    });
  });

  it("uses context as the validation requirement when acceptance is omitted", async () => {
    mockGetAIClient.mockReturnValue(
      modelReturning([
        { title: "No-AC task", context: "Ship the smallest slice." },
      ]),
    );

    const response = await POST(req({ column: "pipeline" }));

    expect(response.status).toBe(200);
    expect(mockCreateTaskOnce.mock.calls[0][0]).toMatchObject({
      priority: "P3",
      validationRequired: ["Ship the smallest slice."],
    });
  });

  it("reuses an atomically deduplicated CRM task without duplicating its event", async () => {
    mockGetAIClient.mockReturnValue(
      modelReturning([
        { title: "Same task", context: "Same stable context.", acceptance: ["done"] },
      ]),
    );
    mockCreateTaskOnce.mockResolvedValue({
      task: storedTask("existing-1", "Same task"),
      created: false,
    });

    const first = await POST(req({ column: "hot" }));
    const second = await POST(req({ column: "hot" }));
    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(mockCreateTaskOnce.mock.calls[0][0].externalRef).toBe(
      mockCreateTaskOnce.mock.calls[1][0].externalRef,
    );
    expect(mockAppendTaskEvent).not.toHaveBeenCalled();
    expect(firstPayload).toMatchObject({ createdCount: 0, skippedExistingCount: 1 });
    expect(secondPayload).toMatchObject({ createdCount: 0, skippedExistingCount: 1 });
  });

  it("reports partial persistence instead of claiming full success", async () => {
    mockGetAIClient.mockReturnValue(
      modelReturning([
        { title: "Saved task", context: "one", acceptance: ["saved"] },
        { title: "Failed task", context: "two", acceptance: ["saved"] },
      ]),
    );
    mockCreateTaskOnce
      .mockResolvedValueOnce({ task: storedTask("saved-1", "Saved task"), created: true })
      .mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(req({ column: "today" }));
    const payload = await response.json();

    expect(response.status).toBe(207);
    expect(payload).toMatchObject({
      createdCount: 1,
      skippedExistingCount: 0,
      failedCount: 1,
      partial: true,
      linearCreated: 0,
      hermesCreated: 0,
    });
    expect(payload.failures).toEqual([{ title: "Failed task", error: "persistence_failed" }]);
  });
});
