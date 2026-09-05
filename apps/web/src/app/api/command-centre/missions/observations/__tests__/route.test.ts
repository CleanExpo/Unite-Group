import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/command-centre/tasks", () => ({ getTaskById: vi.fn() }));
vi.mock("@/lib/command-centre/delivery-projects", () => ({
  getDeliveryProjectByName: vi.fn(),
}));
vi.mock("@/lib/command-centre/delivery-observations", () => ({
  observeDelivery: vi.fn(),
}));

import { getUser } from "@/lib/supabase/server";
import { getTaskById } from "@/lib/command-centre/tasks";
import { getDeliveryProjectByName } from "@/lib/command-centre/delivery-projects";
import { observeDelivery } from "@/lib/command-centre/delivery-observations";
import {
  observationFixture,
  taskId,
} from "@/lib/command-centre/__tests__/delivery-observations.fixture";
import { POST } from "../route";

const request = (body: unknown = { taskId }) =>
  new Request("http://localhost/api/command-centre/missions/observations", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

describe("mission observations route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: "founder-1" } as never);
    const { task, project } = observationFixture();
    vi.mocked(getTaskById).mockResolvedValue(task);
    vi.mocked(getDeliveryProjectByName).mockResolvedValue(project);
    vi.mocked(observeDelivery).mockResolvedValue({
      state: "observed",
      liveVerification: "not_connected",
    } as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires founder auth before looking up any task", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(getTaskById).not.toHaveBeenCalled();
    expect(observeDelivery).not.toHaveBeenCalled();
  });
  it.each([
    { taskId: "bad-id" },
    { taskId, shipped: true },
    { taskId, url: "https://evil.test" },
    null,
  ])("rejects malformed or forged payload %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(getTaskById).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON", async () => {
    expect(
      (
        await POST(
          new Request("http://localhost", { method: "POST", body: "{" }),
        )
      ).status,
    ).toBe(400);
  });
  it("unknown and other-founder task both return 404", async () => {
    vi.mocked(getTaskById).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(404);
    expect(getTaskById).toHaveBeenCalledWith({
      taskId,
      founderId: "founder-1",
    });
    expect(observeDelivery).not.toHaveBeenCalled();
  });
  it("rejects a damaged software delivery envelope", async () => {
    const { task } = observationFixture();
    task.metadata = {};
    vi.mocked(getTaskById).mockResolvedValue(task);
    expect((await POST(request())).status).toBe(409);
    expect(observeDelivery).not.toHaveBeenCalled();
  });
  it("never reads provider evidence for a row owned by a different founder", async () => {
    const { task } = observationFixture();
    vi.mocked(getTaskById).mockResolvedValue({
      ...task,
      founder_id: "other-founder",
    });
    expect((await POST(request())).status).toBe(404);
    expect(observeDelivery).not.toHaveBeenCalled();
  });
  it("reads only the saved project and sends server token only to provider helper", async () => {
    vi.stubEnv("GITHUB_TOKEN", "server-secret");
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(getDeliveryProjectByName).toHaveBeenCalledWith("Unite-Group");
    expect(observeDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: taskId }),
      expect.objectContaining({ github_repo: "CleanExpo/Unite-Group" }),
      { token: "server-secret" },
    );
    expect(await res.text()).not.toContain("server-secret");
    expect(getTaskById).toHaveBeenCalledTimes(2);
  });
  it("rejects provider output when mission changes mid-refresh", async () => {
    const { task } = observationFixture();
    vi.mocked(getTaskById)
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce({ ...task, updated_at: "2026-09-05T01:00:00Z" });
    const res = await POST(request());
    expect(res.status).toBe(409);
    expect(await res.text()).not.toContain("observed");
  });
  it("also detects changed metadata without an updated timestamp", async () => {
    const { task } = observationFixture();
    vi.mocked(getTaskById)
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce({ ...task, metadata: { delivery: {} } });
    expect((await POST(request())).status).toBe(409);
  });
  it("does not disclose persistence failure details", async () => {
    vi.mocked(getTaskById).mockRejectedValue(new Error("database secret"));
    const res = await POST(request());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("database secret");
  });
});
