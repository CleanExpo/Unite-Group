import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkPacket } from "@/lib/command-centre/work-packet";

vi.mock("@/lib/supabase/server", () => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}));

vi.mock("@/lib/command-centre/work-packet-store", () => ({
  saveWorkPacket: vi.fn(),
  listWorkPackets: vi.fn(),
}));

import { getUser } from "@/lib/supabase/server";
import {
  saveWorkPacket,
  listWorkPackets,
} from "@/lib/command-centre/work-packet-store";
import { POST, GET } from "../route";

function makePacket(overrides: Partial<WorkPacket> = {}): WorkPacket {
  return {
    id: "wp-ship-the-api-2026-06-16T00:00:00.000Z",
    outcome: "Ship the API",
    projectKey: "unite-group",
    clientId: null,
    lane: "ops",
    riskLevel: "low",
    status: "draft",
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

function makePostRequest(body: unknown): Request {
  return new Request("https://app.test/api/command-centre/work-packet", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query: Record<string, string> = {}): Request {
  const url = new URL("https://app.test/api/command-centre/work-packet");
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  return new Request(url, { method: "GET" });
}

// No secret value should ever surface in a response body — the route handles
// none, but a regression that leaked one (service-role key, vault key, etc.)
// would show up here.
const FORBIDDEN_IN_BODY: readonly string[] = [
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAULT_ENCRYPTION_KEY",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "password",
  "secret",
];

function assertNoSecrets(json: unknown): void {
  const serialised = JSON.stringify(json).toLowerCase();
  for (const token of FORBIDDEN_IN_BODY) {
    expect(serialised).not.toContain(token.toLowerCase());
  }
}

describe("POST /api/command-centre/work-packet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);

    const res = await POST(makePostRequest({ outcome: "Ship the API" }));
    expect(res.status).toBe(401);
    expect(saveWorkPacket).not.toHaveBeenCalled();
  });

  it("returns 400 when the body has no outcome", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);

    const res = await POST(makePostRequest({ projectKey: "synthex" }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("outcome_required");
    expect(saveWorkPacket).not.toHaveBeenCalled();
  });

  it.each([
    [{ outcome: "Ship it", lane: "root-shell" }, "invalid_lane"],
    [{ outcome: "Ship it", riskLevel: "critical" }, "invalid_risk_level"],
    [
      { outcome: "Ship it", touchesCrmWrite: "false" },
      "invalid_touches_crm_write",
    ],
  ])("rejects untrusted runtime fields before persistence", async (body, error) => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error });
    expect(saveWorkPacket).not.toHaveBeenCalled();
  });

  it("persists via saveWorkPacket and returns the packet, mode, linearInput and created", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    const saved = makePacket({ status: "draft" });
    vi.mocked(saveWorkPacket).mockResolvedValue(saved);

    const res = await POST(makePostRequest({ outcome: "Ship the API" }));
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      packet: WorkPacket;
      mode: string;
      linearInput: { title: string; teamKey: string };
      created: unknown;
    };
    expect(json.packet.outcome).toBe("Ship the API");
    expect(json.mode).toBe("plan-only");
    expect(json.created).toBeNull();
    expect(json.linearInput.title).toBe("Ship the API");

    expect(saveWorkPacket).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      expect.objectContaining({ outcome: "Ship the API" }),
    );

    assertNoSecrets(json);
  });
});

describe("GET /api/command-centre/work-packet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    expect(listWorkPackets).not.toHaveBeenCalled();
  });

  it("returns the founder packets and passes a whitelisted status through", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    const packets = [makePacket({ status: "running" })];
    vi.mocked(listWorkPackets).mockResolvedValue(packets);

    const res = await GET(makeGetRequest({ status: "running" }));
    expect(res.status).toBe(200);

    const json = (await res.json()) as { packets: WorkPacket[] };
    expect(json.packets).toHaveLength(1);
    expect(json.packets[0].status).toBe("running");

    // 'running' is a member of PACKET_STATUSES, so it reaches the store filter.
    expect(listWorkPackets).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      expect.objectContaining({ status: "running" }),
    );

    assertNoSecrets(json);
  });

  it("drops a status that is not whitelisted against PACKET_STATUSES", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "user-123" } as never);
    vi.mocked(listWorkPackets).mockResolvedValue([]);

    const res = await GET(makeGetRequest({ status: "detonate" }));
    expect(res.status).toBe(200);

    // An unknown status must NOT be forwarded — the filter carries no status.
    const filter = vi.mocked(listWorkPackets).mock.calls[0][2];
    expect(filter?.status).toBeUndefined();
  });
});
