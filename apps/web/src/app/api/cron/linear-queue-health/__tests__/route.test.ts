import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/integrations/linear", () => ({ fetchClaimCandidates: vi.fn() }));

import { fetchClaimCandidates } from "@/lib/integrations/linear";
import { GET } from "../route";

const originalCronSecret = process.env.CRON_SECRET;
const originalLinearKey = process.env.LINEAR_API_KEY;
const originalLive = process.env.CC_LINEAR_LIVE;

function request(auth = "Bearer test-secret") {
  return new Request("https://unite.test/api/cron/linear-queue-health", {
    headers: { authorization: auth },
  });
}

describe("GET /api/cron/linear-queue-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    process.env.LINEAR_API_KEY = "configured-key";
    delete process.env.CC_LINEAR_LIVE;
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
    if (originalLinearKey === undefined) delete process.env.LINEAR_API_KEY;
    else process.env.LINEAR_API_KEY = originalLinearKey;
    if (originalLive === undefined) delete process.env.CC_LINEAR_LIVE;
    else process.env.CC_LINEAR_LIVE = originalLive;
  });

  it("returns 401 without listing projections", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(fetchClaimCandidates).not.toHaveBeenCalled();
  });

  it("returns an unconfigured retired inventory without a Linear key", async () => {
    delete process.env.LINEAR_API_KEY;
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      state: "unconfigured",
      authority: "crm-ownest",
      executionEnabled: false,
    });
    expect(fetchClaimCandidates).not.toHaveBeenCalled();
  });

  it.each([undefined, "0", "1"])(
    "remains retired for CC_LINEAR_LIVE=%s",
    async (value) => {
      if (value === undefined) delete process.env.CC_LINEAR_LIVE;
      else process.env.CC_LINEAR_LIVE = value;
      vi.mocked(fetchClaimCandidates).mockResolvedValue([] as never);

      const response = await GET(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        state: "retired",
        authority: "crm-ownest",
        executionEnabled: false,
        legacyLabelledProjectionCount: 0,
      });
    },
  );

  it("fails honestly when read-only inventory is unavailable", async () => {
    vi.mocked(fetchClaimCandidates).mockRejectedValue(
      new Error("Linear API unavailable"),
    );
    const response = await GET(request());
    expect(response.status).toBe(500);
  });
});
