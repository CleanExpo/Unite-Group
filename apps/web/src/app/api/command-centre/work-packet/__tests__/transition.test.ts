import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkPacket } from "@/lib/command-centre/work-packet";
import type { ApplyPacketTransitionResult } from "@/lib/command-centre/work-packet-store";

vi.mock("@/lib/supabase/server", () => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}));

vi.mock("@/lib/command-centre/work-packet-store", () => ({
  applyPacketTransition: vi.fn(),
}));

import { getUser } from "@/lib/supabase/server";
import { applyPacketTransition } from "@/lib/command-centre/work-packet-store";
import { POST } from "../[id]/transition/route";

function makePacket(overrides: Partial<WorkPacket> = {}): WorkPacket {
  return {
    id: "wp-test-2026",
    outcome: "Ship the thing",
    projectKey: "unite-group",
    clientId: null,
    lane: "ops",
    riskLevel: "low",
    status: "running",
    nextActionOwner: "hermes",
    approvalRequired: false,
    approvedBy: null,
    labels: ["source:crm-work-packet"],
    linearIssueId: null,
    evidencePath: null,
    createdAt: "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
}

function makeRequest(body: unknown): Request {
  return new Request(
    "https://app.test/api/command-centre/work-packet/wp-test-2026/transition",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

const params = Promise.resolve({ id: "wp-test-2026" });

describe("POST /api/command-centre/work-packet/[id]/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies a valid transition and returns the new packet", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    const next = makePacket({
      status: "completed",
      evidencePath: "/evidence/x.md",
    });
    const result: ApplyPacketTransitionResult = {
      ok: true,
      packet: next,
      reason: "completed",
    };
    vi.mocked(applyPacketTransition).mockResolvedValue(result);

    const res = await POST(makeRequest({ event: "complete" }), { params });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { packet: WorkPacket; reason: string };
    expect(json.packet.status).toBe("completed");
    expect(json.reason).toBe("completed");
    expect(applyPacketTransition).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      "wp-test-2026",
      { type: "complete", evidencePath: undefined },
    );
  });

  it("returns 409 when the transition is refused", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    const current = makePacket({ approvalRequired: true, approvedBy: null });
    const result: ApplyPacketTransitionResult = {
      ok: false,
      packet: current,
      reason: "cannot complete: approval required and not approved",
    };
    vi.mocked(applyPacketTransition).mockResolvedValue(result);

    const res = await POST(makeRequest({ event: "complete" }), { params });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string; reason: string };
    expect(json.error).toBe("transition_refused");
    expect(json.reason).toContain("approval required");
  });

  it("returns 404 when the packet does not exist", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    const result: ApplyPacketTransitionResult = {
      ok: false,
      packet: null,
      reason: "packet wp-test-2026 not found",
    };
    vi.mocked(applyPacketTransition).mockResolvedValue(result);

    const res = await POST(makeRequest({ event: "start" }), { params });
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("not_found");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);

    const res = await POST(makeRequest({ event: "start" }), { params });
    expect(res.status).toBe(401);
    expect(applyPacketTransition).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown event type", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);

    const res = await POST(makeRequest({ event: "detonate" }), { params });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_event");
    expect(applyPacketTransition).not.toHaveBeenCalled();
  });
});
