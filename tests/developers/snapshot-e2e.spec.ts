// tests/developers/snapshot-e2e.spec.ts
//
// E2E integration test for `buildSnapshot` — wires up a chainable
// Supabase mock that returns table-specific fixtures, then asserts:
//   1. Rolling-window aggregates (today / week / month) compute correctly
//   2. branchTicketMap is populated when developer_branch_map has rows
//   3. openPRs surface and linkedLinearIssueId is extracted from head_ref
//   4. Failure path: when developer_branch_map query rejects, the
//      snapshot still returns with branchTicketMap: [] thanks to the
//      Promise.allSettled graceful degradation in repository.ts.
//
// Mock strategy: a chainable Proxy keyed by the `.from(table)` argument.
// Each entry in `tableFixtures` is either an array (success) or the
// sentinel `REJECT` (the thenable rejects, simulating a network error).
// The proxy is a `then`-able so `await sb.from(...).select(...).eq(...)`
// resolves to `{data, error}` — same shape as the real client.
//
// Pattern adapted from tests/integrations/sync-contract.spec.ts but
// extended with per-table routing.

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

type FixtureRow = Record<string, unknown>;
const REJECT = Symbol("REJECT");
type Fixture = FixtureRow[] | typeof REJECT;

// Mutable per-test fixture map. Mutating the variable below before each
// test re-seeds the proxy via the closure inside the mock factory.
let tableFixtures: Record<string, Fixture> = {};

jest.mock("@/lib/supabase/admin", () => {
  const makeChainable = (tableName: string | null): unknown =>
    new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === "then") {
          // Resolve to {data, error} mimicking PostgREST. If the fixture
          // is the REJECT sentinel, the thenable rejects so the caller's
          // Promise.allSettled records a rejection.
          return (
            resolve: (v: { data: FixtureRow[]; error: null }) => void,
            reject: (e: Error) => void,
          ) => {
            if (!tableName) {
              resolve({ data: [], error: null });
              return;
            }
            const fx = tableFixtures[tableName];
            if (fx === REJECT) {
              reject(new Error(`mock rejection for ${tableName}`));
              return;
            }
            resolve({ data: fx ?? [], error: null });
          };
        }
        if (prop === Symbol.toPrimitive || prop === Symbol.iterator) {
          return undefined;
        }
        if (prop === "from") {
          // sb.from(tableName) — capture and pass forward.
          return (t: string) => makeChainable(t);
        }
        // .select / .eq / .in / .gte / .order / .limit / .maybeSingle etc
        // all return the same chainable scoped to the same table.
        return () => makeChainable(tableName);
      },
      apply() {
        return makeChainable(tableName);
      },
    });
  return {
    getAdminClient: () => makeChainable(null),
    supabaseAdmin: makeChainable(null),
  };
});

// Imports under test — must come AFTER the mock so the module-load
// `getAdminClient` call resolves to the mocked version.
import { buildSnapshot } from "@/lib/developers/repository";
import type { DeveloperProfile } from "@/lib/developers/types";

const RANA: DeveloperProfile = {
  id: 1,
  displayName: "Rana Muzamil",
  primaryEmail: "ranamuzamil1199@gmail.com",
  gitAuthorEmails: ["ranamuzamil1199@gmail.com"],
  githubLogin: null,
  role: "contract-engineer",
  country: "PK",
  timezone: "Asia/Karachi",
  hiredAt: "2025-11-01",
  active: true,
};

// Build a commit fixture: N commits at the given ms-offset from now.
function commit(offsetMs: number, repo = "CleanExpo/CCW-CRM"): FixtureRow {
  return {
    sha: `sha-${offsetMs}`,
    repo,
    author_email: "ranamuzamil1199@gmail.com",
    committed_at: new Date(Date.now() - offsetMs).toISOString(),
    branch: null,
  };
}

describe("buildSnapshot — E2E", () => {
  beforeEach(() => {
    tableFixtures = {};
  });

  it("computes rolling-window aggregates, branchTicketMap, and open PRs", async () => {
    const day = 86_400_000;
    tableFixtures.integration_github_commits = [
      // Today: 2 commits
      commit(1 * 3_600_000),
      commit(2 * 3_600_000),
      // This week (within 7d but not today): 1 commit
      commit(3 * day),
      // This month (within 30d but outside week): 1 commit
      commit(20 * day, "CleanExpo/CARSI"),
    ];
    tableFixtures.integration_github_prs = [
      {
        id: "CleanExpo/CCW-CRM#160",
        repo: "CleanExpo/CCW-CRM",
        number: 160,
        title: "feat: cin7 sync",
        author_email: "ranamuzamil1199@gmail.com",
        head_ref: "feat/ccw-160-cin7",
        ci_state: "success",
        mergeable: "MERGEABLE",
        created_at: new Date(Date.now() - 5 * day).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    tableFixtures.developer_branch_map = [
      {
        repo: "CleanExpo/CCW-CRM",
        branch: "feat/ccw-160-cin7",
        linear_issue_id: "CCW-160",
        last_seen_at: new Date(Date.now() - 1 * day).toISOString(),
      },
      {
        repo: "CleanExpo/CARSI",
        branch: "main",
        linear_issue_id: null,
        last_seen_at: new Date(Date.now() - 2 * day).toISOString(),
      },
    ];
    tableFixtures.integration_linear_issues = [
      {
        id: "CCW-160",
        title: "Wire up Cin7 → CRM contact sync",
        state_name: "In Progress",
        state_type: "started",
      },
    ];

    const snap = await buildSnapshot(RANA);

    // Aggregates
    expect(snap.profile.displayName).toBe("Rana Muzamil");
    expect(snap.sparkline).toHaveLength(14);
    expect(snap.commitsToday).toBe(2);
    expect(snap.commitsThisWeek).toBe(3); // 2 today + 1 three days ago
    expect(snap.commitsThisMonth).toBe(4);

    // Per-repo
    const ccw = snap.perRepo.find((r) => r.repo === "CleanExpo/CCW-CRM");
    const carsi = snap.perRepo.find((r) => r.repo === "CleanExpo/CARSI");
    expect(ccw?.commits14d).toBe(3);
    expect(carsi?.commits14d).toBe(1);

    // PR surfaced + Linear key extracted from head_ref
    expect(snap.openPRs).toHaveLength(1);
    expect(snap.openPRs[0].linkedLinearIssueId).toBe("CCW-160");
    expect(snap.openPRs[0].daysOpen).toBeGreaterThanOrEqual(4);

    // PR is mergeable, CI success, >2 days open → blocked-on-review
    expect(snap.prsBlockedOnReview).toHaveLength(1);

    // branchTicketMap joined with Linear
    expect(snap.branchTicketMap).toHaveLength(2);
    const ccwLink = snap.branchTicketMap.find(
      (b) => b.branch === "feat/ccw-160-cin7",
    );
    expect(ccwLink?.linearIssueId).toBe("CCW-160");
    expect(ccwLink?.linearTitle).toBe("Wire up Cin7 → CRM contact sync");
    expect(ccwLink?.linearStatus).toBe("In Progress");

    // hoursSinceLastPush populated
    expect(snap.hoursSinceLastPush).not.toBeNull();
    expect(snap.hoursSinceLastPush!).toBeGreaterThanOrEqual(0);
  });

  it("degrades gracefully when developer_branch_map query rejects", async () => {
    // Commits + PRs resolve normally; branch_map rejects (simulates a
    // missing table / RLS failure / network blip). The opus-fix uses
    // Promise.allSettled so the snapshot still returns.
    tableFixtures.integration_github_commits = [
      commit(2 * 3_600_000),
    ];
    tableFixtures.integration_github_prs = [];
    tableFixtures.developer_branch_map = REJECT;

    const snap = await buildSnapshot(RANA);

    expect(snap.profile.primaryEmail).toBe(RANA.primaryEmail);
    expect(snap.branchTicketMap).toEqual([]);
    expect(snap.staleBranches).toEqual([]);
    expect(snap.commitsToday).toBe(1); // commits path still worked
    // Sparkline still rendered the full 14-day window
    expect(snap.sparkline).toHaveLength(14);
  });

  it("returns empty aggregates when every table returns no rows", async () => {
    // Nothing seeded → all fixtures default to [].
    const snap = await buildSnapshot(RANA);
    expect(snap.commitsToday).toBe(0);
    expect(snap.commitsThisWeek).toBe(0);
    expect(snap.commitsThisMonth).toBe(0);
    expect(snap.openPRs).toEqual([]);
    expect(snap.branchTicketMap).toEqual([]);
    expect(snap.hoursSinceLastPush).toBeNull();
    expect(snap.lastPushAt).toBeNull();
  });
});
