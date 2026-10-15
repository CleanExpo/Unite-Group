import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/command-centre/idea-evidence-store", () => ({
  admitExternalIdeaEvidence: vi.fn(),
  IdeaEvidenceError: class extends Error {
    constructor(public kind: string) {
      super("sensitive provider detail");
    }
  },
}));
import {
  admitExternalIdeaEvidence,
  IdeaEvidenceError,
} from "@/lib/command-centre/idea-evidence-store";
import { POST } from "../route";

function request(
  body: unknown = { envelope: { event_id: "example" }, signature: "signature" },
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return new Request("https://unite-group.in/api/integrations/idea-evidence", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
describe("signed idea evidence ingestion", () => {
  beforeEach(() => {
    vi.stubEnv("IDEA_EVIDENCE_ENABLED", "1");
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());
  it("fails closed while evidence ingestion is disabled", async () => {
    vi.stubEnv("IDEA_EVIDENCE_ENABLED", "0");
    expect((await POST(request())).status).toBe(503);
    expect(admitExternalIdeaEvidence).not.toHaveBeenCalled();
  });
  it("admits only envelope and signature, returning durable identity and original time", async () => {
    vi.mocked(admitExternalIdeaEvidence).mockResolvedValue({
      id: "event-1",
      admitted_at: "2026-10-16T01:00:00.000Z",
    } as never);
    const response = await POST(request());
    expect(await response.json()).toEqual({
      eventId: "event-1",
      admittedAt: "2026-10-16T01:00:00.000Z",
    });
    expect(admitExternalIdeaEvidence).toHaveBeenCalledWith({
      envelope: { event_id: "example" },
      signature: "signature",
    });
  });
  it("rejects caller-supplied enrollment or expected ownership fields", async () => {
    expect(
      (
        await POST(
          request({
            envelope: {},
            signature: "signature",
            expected: { founder_id: "fake" },
            registration: {},
          }),
        )
      ).status,
    ).toBe(400);
    expect(admitExternalIdeaEvidence).not.toHaveBeenCalled();
  });
  it("requires JSON and rejects malformed input before the store", async () => {
    expect(
      (await POST(request("{}", { "content-type": "text/plain" }))).status,
    ).toBe(400);
    expect((await POST(request("{"))).status).toBe(400);
    expect(admitExternalIdeaEvidence).not.toHaveBeenCalled();
  });
  it("enforces the streamed UTF-8 byte limit even without content length", async () => {
    expect((await POST(request("é".repeat(524_289)))).status).toBe(400);
    expect(admitExternalIdeaEvidence).not.toHaveBeenCalled();
  });
  it("returns unauthorized for an untrusted issuer without leaking provider details", async () => {
    vi.mocked(admitExternalIdeaEvidence).mockRejectedValue(
      new IdeaEvidenceError("unauthorized"),
    );
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Evidence rejected" });
  });
  it("returns conflict for incompatible replay and unavailable for a failed readback", async () => {
    vi.mocked(admitExternalIdeaEvidence)
      .mockRejectedValueOnce(new IdeaEvidenceError("conflict"))
      .mockRejectedValueOnce(new IdeaEvidenceError("unavailable"));
    expect((await POST(request())).status).toBe(409);
    expect((await POST(request())).status).toBe(503);
  });
});
