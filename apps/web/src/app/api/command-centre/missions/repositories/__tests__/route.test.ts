import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/command-centre/delivery-repositories", async (original) => ({
  ...(await original<object>()),
  listDeliveryRepositories: vi.fn(),
}));
import { getUser } from "@/lib/supabase/server";
import { listDeliveryRepositories } from "@/lib/command-centre/delivery-repositories";
import { GET } from "../route";
const request = (query = "") =>
  new Request(
    `https://example.test/api/command-centre/missions/repositories${query}`,
  );
describe("repository catalogue authentication and pagination", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: "founder" } as never);
    vi.mocked(listDeliveryRepositories).mockResolvedValue({
      status: "complete",
      repositories: [],
      nextCursor: null,
      incomplete: false,
      coverage: "Runtime token",
      observedAt: "2026-09-05T00:00:00Z",
      message: "Complete",
    });
  });
  it("requires founder authentication before any repository read", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(listDeliveryRepositories).not.toHaveBeenCalled();
  });
  it("passes cursor through and disables private response caching", async () => {
    const result = await GET(request("?cursor=2"));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(listDeliveryRepositories).toHaveBeenCalledWith("2");
  });
  it.each([
    "?cursor=0",
    "?cursor=2&cursor=3",
    "?owner=Other",
    "?cursor=https://other.test",
  ])("rejects unsupported query %s", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
    expect(listDeliveryRepositories).not.toHaveBeenCalled();
  });
  it("returns honest provider auth failure separately from founder login", async () => {
    vi.mocked(listDeliveryRepositories).mockResolvedValue({
      status: "auth_error",
      repositories: [],
      nextCursor: null,
      incomplete: true,
      coverage: "Runtime token",
      observedAt: "2026-09-05T00:00:00Z",
      message: "Connection unavailable",
    });
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect((await result.json()).status).toBe("auth_error");
  });
});
