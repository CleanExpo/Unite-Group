import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn(), resolve: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUser: mock.getUser, createClient: mock.createClient }));
vi.mock("@/lib/weekly-tasks/margot-media-access", () => ({ resolveMargotMedia: mock.resolve }));
vi.mock("@/lib/weekly-tasks/margot-content-review.server", () => ({ signPrivateMargotMedia: mock.sign }));
vi.mock("server-only", () => ({}));
import { GET } from "../route";
beforeEach(() => { vi.resetAllMocks(); mock.getUser.mockResolvedValue({ id: "owner" }); mock.createClient.mockResolvedValue({}); });
it("does not sign or create a client for anonymous playback", async () => {
  mock.getUser.mockResolvedValue(null);
  expect((await GET(new Request("https://example.test/api"))).status).toBe(401);
  expect(mock.createClient).not.toHaveBeenCalled(); expect(mock.sign).not.toHaveBeenCalled();
});
it("returns a temporary private redirect only for a verified available result", async () => {
  mock.resolve.mockResolvedValue({ status: "available", url: "https://storage.example.test/synthetic-signed" });
  const response = await GET(new Request("https://example.test/api?version=2"));
  expect(response.status).toBe(307); expect(response.headers.get("location")).toBe("https://storage.example.test/synthetic-signed");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer"); expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("does not redirect when the packet is stale or signing fails", async () => {
  mock.resolve.mockResolvedValue({ status: "stale" });
  const response = await GET(new Request("https://example.test/api?version=2"));
  expect(response.status).toBe(409); expect(response.headers.get("location")).toBeNull();
});
it("distinguishes invalid playback requests from a storage outage", async () => {
  mock.resolve.mockResolvedValue({ status: "invalid" });
  expect((await GET(new Request("https://example.test/api?version=invalid"))).status).toBe(400);
});
