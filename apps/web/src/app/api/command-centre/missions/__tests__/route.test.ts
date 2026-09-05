import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/command-centre/tasks", () => ({
  listTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTaskOnce: vi.fn(),
}));
vi.mock("@/lib/command-centre/delivery-prepare", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/command-centre/delivery-prepare")
    >();
  return { ...actual, prepareDeliveryMission: vi.fn() };
});
import { getUser } from "@/lib/supabase/server";
import { listTasks } from "@/lib/command-centre/tasks";
import {
  prepareDeliveryMission,
  DeliveryPreparationFailure,
} from "@/lib/command-centre/delivery-prepare";
import {
  DeliveryConflict,
  DeliveryNotFound,
} from "@/lib/command-centre/delivery-store";
import { GET, POST } from "../route";
import type { CommandCentreTask } from "@/lib/command-centre/tasks";

const taskId = "a0000000-0000-4000-8000-000000000001";
const req = (body: unknown) =>
  new Request("https://app.test/api/command-centre/missions", {
    method: "POST",
    body: JSON.stringify(body),
  });
const input = {
  action: "prepare",
  clientRequestId: taskId,
  idea: "Build a portal for Unite-Group",
  presetIds: [],
};
const task = {
  id: taskId,
  founder_id: "owner",
  external_ref: `delivery:${taskId}`,
  metadata: {},
  title: "Idea",
  objective: "Idea",
  project_key: "Unite-Group",
  status: "proposed",
  updated_at: "2026-09-05T00:00:00Z",
} as CommandCentreTask;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ id: "owner" } as never);
});

describe("missions authenticated orchestration API", () => {
  it("refuses unauthenticated reads and writes without work", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(req(input))).status).toBe(401);
    expect(prepareDeliveryMission).not.toHaveBeenCalled();
  });
  it("rejects client stage/receipt fields and unknown presets", async () => {
    expect((await POST(req({ ...input, stage: "live_verified" }))).status).toBe(
      400,
    );
    expect(
      (await POST(req({ ...input, presetIds: ["arbitrary-code"] }))).status,
    ).toBe(400);
    expect(prepareDeliveryMission).not.toHaveBeenCalled();
  });
  it("passes authenticated identity and validated input to real workflow seam", async () => {
    vi.mocked(prepareDeliveryMission).mockResolvedValue({
      task,
      deduplicated: false,
    });
    const response = await POST(req(input));
    expect(response.status).toBe(200);
    expect(prepareDeliveryMission).toHaveBeenCalledWith("owner", input);
    expect((await response.json()).mission.taskId).toBe(taskId);
  });
  it("lists only durable delivery identities within authenticated founder scope", async () => {
    vi.mocked(listTasks).mockResolvedValue([
      task,
      { ...task, id: "legacy", external_ref: null },
    ]);
    const response = await GET();
    expect(listTasks).toHaveBeenCalledWith({ founderId: "owner", limit: 100 });
    expect(
      (await response.json()).missions.map((m: { taskId: string }) => m.taskId),
    ).toEqual([taskId]);
  });
  it("returns saved mission identity on provider failure for safe resume", async () => {
    vi.mocked(prepareDeliveryMission).mockRejectedValue(
      new DeliveryPreparationFailure(task, "Could not prepare"),
    );
    const response = await POST(req(input));
    expect(response.status).toBe(502);
    expect((await response.json()).mission.taskId).toBe(taskId);
  });
  it("surfaces conflicts and absent founder-owned missions without false success", async () => {
    vi.mocked(prepareDeliveryMission)
      .mockRejectedValueOnce(new DeliveryConflict())
      .mockRejectedValueOnce(new DeliveryNotFound());
    expect((await POST(req(input))).status).toBe(409);
    expect((await POST(req({ action: "resume", taskId }))).status).toBe(404);
  });
  it("failed listing does not pretend there are no missions", async () => {
    vi.mocked(listTasks).mockRejectedValue(new Error("database unreachable"));
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.source).toBe("error");
    expect(body.missions).toBeUndefined();
  });
});
