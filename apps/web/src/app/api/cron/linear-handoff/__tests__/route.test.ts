import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/integrations/linear", () => ({
  fetchClaimCandidates: vi.fn(),
  resolveStateId: vi.fn(),
  updateIssueState: vi.fn(),
  addComment: vi.fn(),
}));

import {
  addComment,
  fetchClaimCandidates,
  resolveStateId,
  updateIssueState,
} from "@/lib/integrations/linear";
import { GET } from "../route";

const originalCronSecret = process.env.CRON_SECRET;
const originalLiveGate = process.env.CC_LINEAR_LIVE;

function request(auth = "Bearer test-cron-secret") {
  return new Request("https://unite.test/api/cron/linear-handoff", {
    headers: { authorization: auth },
  });
}

describe("GET /api/cron/linear-handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    delete process.env.CC_LINEAR_LIVE;
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
    if (originalLiveGate === undefined) delete process.env.CC_LINEAR_LIVE;
    else process.env.CC_LINEAR_LIVE = originalLiveGate;
  });

  it("returns 500 when the cron authentication boundary is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "CRON_SECRET not configured",
    });
  });

  it("returns 401 before disclosing the retirement response", async () => {
    const response = await GET(request("Bearer wrong"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorised" });
  });

  it.each([undefined, "0", "1"])(
    "is permanently retired for CC_LINEAR_LIVE=%s",
    async (value) => {
      if (value === undefined) delete process.env.CC_LINEAR_LIVE;
      else process.env.CC_LINEAR_LIVE = value;

      const response = await GET(request());

      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({
        ok: false,
        retired: true,
        source: "command-centre:linear-handoff",
        error:
          "Legacy Linear autonomous handoff is permanently retired. CRM OWNEST is authoritative.",
        next_action: "use_crm_ownest",
      });
      expect(fetchClaimCandidates).not.toHaveBeenCalled();
      expect(resolveStateId).not.toHaveBeenCalled();
      expect(updateIssueState).not.toHaveBeenCalled();
      expect(addComment).not.toHaveBeenCalled();
    },
  );
});
