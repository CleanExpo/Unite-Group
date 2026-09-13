import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn(), save: vi.fn(), store: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUser: mock.getUser, createClient: mock.createClient }));
vi.mock("@/lib/weekly-tasks/margot-content-review", () => ({ saveMargotContentReview: mock.save }));
vi.mock("@/lib/weekly-tasks/margot-content-review.server", () => ({ createContentReviewStore: mock.store, signPrivateMargotMedia: mock.sign }));
vi.mock("server-only", () => ({}));
import { POST } from "../route";
beforeEach(() => { vi.resetAllMocks(); mock.getUser.mockResolvedValue({ id: "owner" }); mock.createClient.mockResolvedValue({}); mock.store.mockReturnValue({}); });
describe("content review HTTP boundary", () => {
  it("authenticates before parsing or creating a client", async () => {
    mock.getUser.mockResolvedValue(null);
    expect((await POST(new Request("https://example.test/api", { method: "POST", body: "not-json" }))).status).toBe(401);
    expect(mock.createClient).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
  });
  it("rejects foreign-origin requests before delegation", async () => {
    expect((await POST(new Request("https://example.test/api", { method: "POST", headers: { Origin: "https://other.test" }, body: "{}" }))).status).toBe(403);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("returns a stale conflict with private no-store headers and no publication call", async () => {
    mock.save.mockResolvedValue({ status: "stale" });
    const response = await POST(new Request("https://example.test/api", { method: "POST", body: "{}" }));
    expect(response.status).toBe(409); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mock.save.mock.calls[0][0].ownerId).toBe("owner"); expect(mock.sign).not.toHaveBeenCalled();
  });
});
it("returns invalid400 for malformed JSON without any decision write", async () => {
  const response = await POST(new Request("https://example.test/api", { method: "POST", body: "{" }));
  expect(response.status).toBe(400); expect(mock.save).not.toHaveBeenCalled();
});
