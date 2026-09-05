import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listDeliveryRepositories,
  readDeliveryRepository,
  parseRepositoryCursor,
} from "../delivery-repositories";

const raw = (full_name: string, extra = {}) => ({
  full_name,
  private: true,
  archived: false,
  ...extra,
});
const response = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const deps = (fetchFn = vi.fn<typeof fetch>()) => ({
  token: "test-only-token",
  fetchFn,
  now: () => 1000000,
});
afterEach(() => vi.unstubAllEnvs());

describe("runtime GitHub repository catalogue", () => {
  it("requests every affiliation and visibility without account or portfolio filtering", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(
      response([
        raw("Owner/Shared"),
        raw("Another/Shared", { private: false, archived: true }),
      ]),
    );
    const result = await listDeliveryRepositories(null, d);
    expect(result).toMatchObject({
      status: "complete",
      incomplete: false,
      nextCursor: null,
      repositories: [
        { fullName: "Owner/Shared", private: true, archived: false },
        { fullName: "Another/Shared", private: false, archived: true },
      ],
    });
    const [url, init] = d.fetchFn.mock.calls[0];
    const query = new URL(String(url));
    expect(query.pathname).toBe("/user/repos");
    expect(query.searchParams.get("affiliation")).toBe(
      "owner,collaborator,organization_member",
    );
    expect(query.searchParams.get("visibility")).toBe("all");
    expect(query.searchParams.get("per_page")).toBe("100");
    expect(init).toMatchObject({
      method: "GET",
      redirect: "error",
      cache: "no-store",
    });
    expect(JSON.stringify(result)).not.toContain(d.token);
  });
  it("traverses all explicit pages and never follows pagination URLs", async () => {
    const d = deps();
    d.fetchFn
      .mockResolvedValueOnce(
        response([raw("Owner/First")], 200, {
          link: '<https://api.github.com/user/repos?page=2>; rel="next"',
        }),
      )
      .mockResolvedValueOnce(response([raw("Org/Last")]));
    const first = await listDeliveryRepositories(null, d);
    expect(first).toMatchObject({
      status: "partial",
      nextCursor: "2",
      incomplete: false,
    });
    const last = await listDeliveryRepositories(first.nextCursor, d);
    expect(last).toMatchObject({
      status: "complete",
      nextCursor: null,
      incomplete: false,
    });
    expect(
      new URL(String(d.fetchFn.mock.calls[1][0])).searchParams.get("page"),
    ).toBe("2");
  });
  it("an exactly full page without pagination headers does not silently truncate", async () => {
    const d = deps();
    d.fetchFn.mockImplementation(async () =>
      response(Array.from({ length: 100 }, (_, i) => raw(`Owner/Repo${i}`))),
    );
    expect(await listDeliveryRepositories(null, d)).toMatchObject({
      status: "partial",
      nextCursor: "2",
      incomplete: false,
    });
    expect(await listDeliveryRepositories("10000", d)).toMatchObject({
      status: "partial",
      nextCursor: null,
      incomplete: true,
    });
  });
  it("keeps malformed-page incompleteness distinguishable from normal pagination", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(
      response([raw("Owner/Valid"), { full_name: "Missing/Flags" }], 200, {
        link: '<https://api.github.com/user/repos?page=2>; rel="next"',
      }),
    );
    expect(await listDeliveryRepositories(null, d)).toMatchObject({
      status: "partial",
      incomplete: true,
      nextCursor: "2",
      repositories: [{ fullName: "Owner/Valid" }],
    });
  });
  it("deduplicates owner/name case-insensitively without conflating different owners", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(
      response([raw("Owner/Repo"), raw("owner/repo"), raw("Other/Repo")]),
    );
    expect((await listDeliveryRepositories(null, d)).repositories).toHaveLength(
      2,
    );
  });
  it("reports a genuinely empty catalogue as complete", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(response([]));
    expect(await listDeliveryRepositories(null, d)).toMatchObject({
      status: "complete",
      repositories: [],
      incomplete: false,
    });
  });
  it("does not call GitHub without a runtime token", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const d = deps();
    expect(
      await listDeliveryRepositories(null, { ...d, token: "" }),
    ).toMatchObject({ status: "not_connected", incomplete: true });
    expect(d.fetchFn).not.toHaveBeenCalled();
  });
  it.each([401, 403])(
    "reports HTTP %s as connection failure",
    async (status) => {
      const d = deps();
      d.fetchFn.mockResolvedValue(
        response({ message: "sensitive upstream body" }, status),
      );
      const result = await listDeliveryRepositories(null, d);
      expect(result.status).toBe("auth_error");
      expect(result.incomplete).toBe(true);
      expect(JSON.stringify(result)).not.toContain("sensitive upstream body");
    },
  );
  it.each([403, 429])(
    "respects rate-limited HTTP %s without retry storms",
    async (status) => {
      const d = deps();
      d.fetchFn.mockResolvedValue(
        response({}, status, { "retry-after": "120" }),
      );
      expect(await listDeliveryRepositories("2", d)).toMatchObject({
        status: "rate_limited",
        retryAfterSeconds: 120,
        incomplete: true,
      });
      expect(d.fetchFn).toHaveBeenCalledOnce();
    },
  );
  it.each([404, 500, 502])(
    "never presents HTTP %s as a complete empty list",
    async (status) => {
      const d = deps();
      d.fetchFn.mockResolvedValue(response({}, status));
      expect(await listDeliveryRepositories(null, d)).toMatchObject({
        status: "unavailable",
        incomplete: true,
      });
    },
  );
  it("bounds stalled fetches even when an injected fetch ignores abort", async () => {
    const d = deps();
    d.fetchFn.mockImplementation(() => new Promise(() => {}));
    expect(
      await listDeliveryRepositories(null, { ...d, timeoutMs: 1 }),
    ).toMatchObject({ status: "unavailable", incomplete: true });
  });
  it.each(["0", "-1", "01", "10001", "https://other.test", "1&owner=other"])(
    "rejects cursor %s before fetch",
    async (cursor) => {
      const d = deps();
      expect(parseRepositoryCursor(cursor)).toBeNull();
      expect((await listDeliveryRepositories(cursor, d)).status).toBe(
        "unavailable",
      );
      expect(d.fetchFn).not.toHaveBeenCalled();
    },
  );
});

describe("selected repository validation", () => {
  it("verifies exact owner/name and retains GitHub casing", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(response(raw("Owner/Repo")));
    expect(await readDeliveryRepository("owner/repo", d)).toEqual({
      fullName: "Owner/Repo",
      private: true,
      archived: false,
    });
    expect(String(d.fetchFn.mock.calls[0][0])).toBe(
      "https://api.github.com/repos/owner/repo",
    );
  });
  it("rejects different owner or renamed repository responses", async () => {
    const d = deps();
    d.fetchFn.mockResolvedValue(response(raw("Other/Repo")));
    await expect(readDeliveryRepository("Owner/Repo", d)).rejects.toThrow(
      /identity changed/,
    );
  });
  it.each([
    "Repo",
    "Owner/..",
    "Owner/Repo/extra",
    "https://github.com/Owner/Repo",
  ])("rejects invalid fullName %s before fetch", async (name) => {
    const d = deps();
    await expect(readDeliveryRepository(name, d)).rejects.toThrow(
      /exact GitHub/,
    );
    expect(d.fetchFn).not.toHaveBeenCalled();
  });
});
