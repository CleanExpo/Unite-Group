import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/auth/private-access", () => ({
  hasPrivateAccess: vi.fn(),
  isPrivateAccessConfigured: vi.fn(),
}));
vi.mock("@/lib/command-centre/portfolio-drift-collector", () => ({
  loadPortfolioControlPlaneRegistry: vi.fn(),
  loadLocalPortfolioManifest: vi.fn(),
}));

import { getUser } from "@/lib/supabase/server";
import {
  hasPrivateAccess,
  isPrivateAccessConfigured,
} from "@/lib/auth/private-access";
import {
  loadLocalPortfolioManifest,
  loadPortfolioControlPlaneRegistry,
} from "@/lib/command-centre/portfolio-drift-collector";
import { GET } from "../route";

describe("GET /api/command-centre/portfolio-control-plane-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPrivateAccess).mockReturnValue(true);
    vi.mocked(isPrivateAccessConfigured).mockReturnValue(true);
  });

  it("fails closed with no-store when unauthenticated", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(loadPortfolioControlPlaneRegistry).not.toHaveBeenCalled();
  });

  it("denies an authenticated user who is outside the configured founder allow-list", async () => {
    vi.mocked(getUser).mockResolvedValue({
      id: "other-user",
      email: "other@example.invalid",
    } as never);
    vi.mocked(hasPrivateAccess).mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(loadPortfolioControlPlaneRegistry).not.toHaveBeenCalled();
  });

  it("returns a quarantined projection rather than an empty or green estate when sources fail", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: "founder" } as never);
    vi.mocked(loadPortfolioControlPlaneRegistry).mockRejectedValue(
      new Error("raw /Users/founder/path must not leak"),
    );
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.registry).toMatchObject({
      state: "quarantined",
      version: null,
    });
    expect(JSON.stringify(body)).not.toContain("/Users/founder");
    expect(loadLocalPortfolioManifest).not.toHaveBeenCalled();
  });

  it("sanitises unexpected authentication failures", async () => {
    vi.mocked(getUser).mockRejectedValue(
      new Error("database credential detail"),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      error: "Portfolio control-plane status unavailable",
    });
  });
});
