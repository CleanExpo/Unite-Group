import { describe, it, expect, vi } from "vitest";
import {
  observeDelivery,
  registeredPullRequest,
} from "../delivery-observations";
import { observationFixture, headSha } from "./delivery-observations.fixture";

const pr = {
  number: 42,
  head: { sha: headSha },
  base: { repo: { full_name: "CleanExpo/Unite-Group" } },
  draft: true,
  state: "open",
  merged: false,
  updated_at: "2026-09-05T00:00:00Z",
};
const response = (body: unknown, more = false) =>
  new Response(JSON.stringify(body), {
    headers: more
      ? { link: '<https://untrusted.example/next>; rel="next"' }
      : {},
  });
function provider(override?: (url: URL) => Response | undefined) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const changed = override?.(url);
    if (changed) return changed;
    if (url.pathname.endsWith("/pulls/42")) return response(pr);
    if (url.pathname.endsWith("/check-runs"))
      return response({
        total_count: 1,
        check_runs: [
          {
            id: 11,
            head_sha: headSha,
            name: "test",
            status: "completed",
            conclusion: "success",
          },
        ],
      });
    if (url.pathname.endsWith("/status"))
      return response({
        sha: headSha,
        total_count: 1,
        statuses: [{ id: 12, context: "build", state: "success" }],
      });
    if (url.pathname.endsWith("/reviews"))
      return response([
        {
          id: 13,
          commit_id: headSha,
          user: { login: "reviewer" },
          state: "APPROVED",
          submitted_at: "2026-09-05T00:01:00Z",
        },
      ]);
    if (url.pathname.endsWith("/deployments"))
      return response([{ id: 14, sha: headSha, environment: "Preview" }]);
    if (url.pathname.endsWith("/statuses"))
      return response([{ id: 15, state: "success" }]);
    throw new Error(`Unexpected endpoint ${url.pathname}`);
  });
}
const run = (fetchFn: typeof fetch = provider()) => {
  const { task, project } = observationFixture();
  return observeDelivery(task, project, { token: "private-token", fetchFn });
};

describe("registry-constrained PR identity", () => {
  it.each([
    "http://github.com/CleanExpo/Unite-Group/pull/42",
    "https://github.com.evil.test/CleanExpo/Unite-Group/pull/42",
    "https://github.com@evil.test/CleanExpo/Unite-Group/pull/42",
    "https://github.com/Other/Unite-Group/pull/42",
    "https://github.com/CleanExpo/Unite-Group/pull/42?target=x",
    "https://github.com/CleanExpo/Unite-Group/pull/42#hash",
    "https://github.com/CleanExpo/Unite-Group/pull/999999999999999999999",
  ])("rejects unsafe reference %s", (value) =>
    expect(registeredPullRequest(value, "CleanExpo/Unite-Group")).toBeNull(),
  );
});

describe("delivery GitHub observations", () => {
  it("binds actual signals to current head/spec but never marks independent review or live delivery", async () => {
    const fetchFn = provider();
    const data = await run(fetchFn);
    expect(data.state).toBe("observed");
    expect(data.pr).toMatchObject({ draft: true, merged: false });
    expect(data.checks.items[0]).toMatchObject({
      commitSha: headSha,
      specRevision: 1,
      specVersion: "c".repeat(64),
      conclusion: "success",
    });
    expect(data.reviews.items[0]).toMatchObject({
      state: "APPROVED",
      currentHead: true,
    });
    expect(data.deployments.items[0]).toMatchObject({
      state: "success",
      environment: "Preview",
      statusReceiptId: "deployment-status:15",
    });
    expect(data.liveVerification).toBe("not_connected");
    expect(JSON.stringify(data)).not.toContain("private-token");
    for (const [url, options] of fetchFn.mock.calls as unknown as Array<
      [string, RequestInit]
    >) {
      expect(url).toMatch(
        /^https:\/\/api\.github\.com\/repos\/CleanExpo\/Unite-Group\//,
      );
      expect(options.redirect).toBe("error");
      expect(options.method).toBeUndefined();
    }
  });
  it("reports missing runtime credentials without a request", async () => {
    const { task, project } = observationFixture();
    const fetchFn = provider();
    expect(
      (await observeDelivery(task, project, { token: undefined, fetchFn }))
        .state,
    ).toBe("not_connected");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("rejects stale build bindings before contacting provider", async () => {
    const { task, project, delivery } = observationFixture();
    delivery.revision = 2;
    const fetchFn = provider();
    expect(
      (await observeDelivery(task, project, { token: "token", fetchFn })).state,
    ).toBe("stale");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("rejects cross-project stored PRs before contacting provider", async () => {
    const { task, project, delivery } = observationFixture();
    delivery.build!.prRef = "https://github.com/Other/Repo/pull/42";
    const fetchFn = provider();
    expect(
      (await observeDelivery(task, project, { token: "token", fetchFn })).state,
    ).toBe("unavailable");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("rejects malformed saved metadata", async () => {
    const { task, project } = observationFixture();
    task.metadata.delivery = { kind: "software_delivery" };
    expect(
      (await observeDelivery(task, project, { token: "token" })).state,
    ).toBe("unavailable");
  });
  it("preserves old-head reviews as explicitly stale", async () => {
    const data = await run(
      provider((url) =>
        url.pathname.endsWith("/reviews")
          ? response([
              {
                id: 13,
                commit_id: "f".repeat(40),
                user: null,
                state: "APPROVED",
              },
            ])
          : undefined,
      ),
    );
    expect(data.reviews.items[0]).toMatchObject({
      currentHead: false,
      commitSha: "f".repeat(40),
    });
  });
  it("refuses mismatched status/check/deployment commits", async () => {
    const data = await run(
      provider((url) => {
        if (url.pathname.endsWith("/status"))
          return response({
            sha: "f".repeat(40),
            total_count: 0,
            statuses: [],
          });
        if (url.pathname.endsWith("/check-runs"))
          return response({
            total_count: 1,
            check_runs: [
              {
                id: 11,
                head_sha: "f".repeat(40),
                name: "test",
                status: "completed",
                conclusion: "success",
              },
            ],
          });
        if (url.pathname.endsWith("/deployments"))
          return response([
            { id: 14, sha: "f".repeat(40), environment: "Production" },
          ]);
      }),
    );
    expect(data.state).toBe("partial");
    expect(data.statuses.state).toBe("unavailable");
    expect(data.checks.state).toBe("unavailable");
    expect(data.deployments.state).toBe("unavailable");
  });
  it("discards signals if the PR moves while they are collected", async () => {
    let reads = 0;
    const data = await run(
      provider((url) =>
        url.pathname.endsWith("/pulls/42") && ++reads === 2
          ? response({ ...pr, head: { sha: "f".repeat(40) } })
          : undefined,
      ),
    );
    expect(data.state).toBe("stale");
    expect(data.headSha).toBeNull();
    expect(data.checks.items).toEqual([]);
  });
  it("refuses a provider PR from another repository", async () => {
    const data = await run(
      provider((url) =>
        url.pathname.endsWith("/pulls/42")
          ? response({ ...pr, base: { repo: { full_name: "Other/Repo" } } })
          : undefined,
      ),
    );
    expect(data.state).toBe("unavailable");
    expect(data.pr).toBeNull();
  });
  it("does not mistake empty evidence lists for passing required checks", async () => {
    const data = await run(
      provider((url) =>
        url.pathname.endsWith("/check-runs")
          ? response({ total_count: 0, check_runs: [] })
          : undefined,
      ),
    );
    expect(data.checks.items).toEqual([]);
    expect(data.limitations.join(" ")).toContain(
      "observed does not mean approved or passing",
    );
    expect(data.liveVerification).toBe("not_connected");
  });
  it("caps pagination and never follows provider Link URLs", async () => {
    const fetchFn = provider((url) =>
      url.pathname.endsWith("/reviews")
        ? response(
            Array.from({ length: 100 }, (_, i) => ({
              id: Number(url.searchParams.get("page")) * 100 + i + 1,
              commit_id: headSha,
              user: null,
              state: "APPROVED",
            })),
            true,
          )
        : undefined,
    );
    const data = await run(fetchFn);
    expect(data.reviews.state).toBe("partial");
    expect(data.reviews.items).toHaveLength(300);
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).includes("/reviews")),
    ).toHaveLength(3);
    expect(
      fetchFn.mock.calls.every(([url]) =>
        String(url).startsWith("https://api.github.com/"),
      ),
    ).toBe(true);
  });
  it("caps deployment statuses to ten and labels truncated deployment coverage", async () => {
    const fetchFn = provider((url) =>
      url.pathname.endsWith("/deployments")
        ? response(
            Array.from({ length: 10 }, (_, i) => ({
              id: i + 1,
              sha: headSha,
              environment: "Preview",
            })),
            true,
          )
        : undefined,
    );
    const data = await run(fetchFn);
    expect(data.deployments.state).toBe("partial");
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).includes("/statuses?")),
    ).toHaveLength(10);
  });
  it("reports malformed provider pages rather than zero passing checks", async () => {
    const data = await run(
      provider((url) =>
        url.pathname.endsWith("/check-runs")
          ? response({ total_count: 2, check_runs: "wrong" })
          : undefined,
      ),
    );
    expect(data.checks.state).toBe("unavailable");
    expect(data.state).toBe("partial");
  });
  it("sanitises provider/network errors", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("private-token secret details");
    });
    const data = await run(fetchFn);
    expect(data.state).toBe("unavailable");
    expect(JSON.stringify(data)).not.toContain("private-token");
  });
  it("keeps inaccessible GitHub evidence explicit", async () => {
    const data = await run(
      vi.fn(async () => new Response("denied", { status: 403 })),
    );
    expect(data.state).toBe("unavailable");
  });
});
