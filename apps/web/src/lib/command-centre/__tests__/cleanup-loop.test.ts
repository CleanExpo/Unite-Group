import { describe, it, expect } from "vitest";
import {
  assessBatch,
  runCleanup,
  findDuplicateGroups,
  classifyIssue,
  buildCleanupSummary,
  type CleanupBatch,
  type CleanupIssue,
} from "@/lib/command-centre/cleanup-loop";

function issue(overrides: Partial<CleanupIssue> = {}): CleanupIssue {
  return {
    id: overrides.id ?? "u1",
    identifier: overrides.identifier ?? "UNI-1",
    title: overrides.title ?? "do a thing",
    stateType: overrides.stateType ?? "completed",
    labels: overrides.labels ?? [],
    blockedByOpenCount: overrides.blockedByOpenCount ?? 0,
    updatedAt: overrides.updatedAt ?? "2026-06-16T10:00:00.000Z",
  };
}

function batch(overrides: Partial<CleanupBatch> = {}): CleanupBatch {
  return {
    scopeId: "scope-1",
    scopeName: "Mission Control loop batch",
    scopeKind: "scoped",
    issues: [],
    ...overrides,
  };
}

const fixedNow = () => "2026-06-16T12:00:00.000Z";
describe("classifyIssue", () => {
  it("classifies terminal / open / blocked", () => {
    expect(classifyIssue(issue({ stateType: "completed" }))).toBe("terminal");
    expect(classifyIssue(issue({ stateType: "canceled" }))).toBe("terminal");
    expect(classifyIssue(issue({ stateType: "started" }))).toBe("open");
    expect(
      classifyIssue(issue({ stateType: "unstarted", blockedByOpenCount: 1 })),
    ).toBe("blocked");
    expect(
      classifyIssue(
        issue({
          stateType: "unstarted",
          labels: ["pi-dev:blocked-reason:credentials"],
        }),
      ),
    ).toBe("blocked");
  });
});

describe("assessBatch — the six states", () => {
  it("complete: all terminal → closeable", () => {
    const a = assessBatch(
      batch({
        issues: [
          issue({ id: "a", stateType: "completed" }),
          issue({ id: "b", stateType: "canceled" }),
        ],
      }),
    );
    expect(a.state).toBe("complete");
    expect(a.closeable).toBe(true);
  });

  it("open: unfinished non-blocked work → not closeable", () => {
    const a = assessBatch(
      batch({
        issues: [
          issue({ id: "a", stateType: "completed" }),
          issue({ id: "b", identifier: "UNI-2", stateType: "started" }),
        ],
      }),
    );
    expect(a.state).toBe("open");
    expect(a.closeable).toBe(false);
  });

  it("blocked-unaccepted: open blocker prevents closure", () => {
    const a = assessBatch(
      batch({
        issues: [
          issue({ id: "a", stateType: "completed" }),
          issue({
            id: "b",
            identifier: "UNI-2",
            stateType: "unstarted",
            labels: ["pi-dev:blocked-reason:credentials"],
          }),
        ],
      }),
    );
    expect(a.state).toBe("blocked");
    expect(a.closeable).toBe(false);
    expect(a.blockers.map((x) => x.identifier)).toContain("UNI-2");
  });

  it("blocked-accepted: an accepted exclusion lets closure proceed", () => {
    const a = assessBatch(
      batch({
        acceptedExclusions: ["b"],
        issues: [
          issue({ id: "a", stateType: "completed" }),
          issue({
            id: "b",
            identifier: "UNI-2",
            stateType: "unstarted",
            labels: ["pi-dev:blocked-reason:credentials"],
          }),
        ],
      }),
    );
    expect(a.state).toBe("closeable_with_exclusions");
    expect(a.closeable).toBe(true);
    expect(a.blockers).toHaveLength(0); // accepted → not a live blocker
  });

  it("duplicate: same-title non-terminal issues are grouped for review", () => {
    const groups = findDuplicateGroups([
      issue({
        id: "a",
        identifier: "UNI-1",
        title: "Wire the cron",
        stateType: "started",
      }),
      issue({
        id: "b",
        identifier: "UNI-2",
        title: "wire the  cron!",
        stateType: "unstarted",
      }),
      issue({
        id: "c",
        identifier: "UNI-3",
        title: "unrelated",
        stateType: "started",
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].identifiers.sort()).toEqual(["UNI-1", "UNI-2"]);
  });

  it("idempotent rerun: an already-closed scope is a no-op state", () => {
    const a = assessBatch(
      batch({
        alreadyClosed: true,
        issues: [issue({ stateType: "completed" })],
      }),
    );
    expect(a.state).toBe("already_closed");
    expect(a.closeable).toBe(false);
  });

  it("never closes a broad roadmap project", () => {
    const a = assessBatch(
      batch({
        scopeKind: "roadmap",
        issues: [issue({ stateType: "completed" })],
      }),
    );
    expect(a.state).toBe("not_scoped");
    expect(a.closeable).toBe(false);
  });
});

describe("runCleanup — assessment only", () => {
  const completeBatch = batch({
    issues: [
      issue({ id: "a", stateType: "completed" }),
      issue({ id: "b", stateType: "canceled" }),
    ],
  });

  it("builds a proposed summary but never closes the scope", async () => {
    const r = await runCleanup(completeBatch, { now: fixedNow });
    expect(r.mode).toBe("assessment-only");
    expect(r.closed).toBe(false);
    expect(r.summary).toContain("Cleanup");
  });

  it("returns open without a summary when unfinished work remains", async () => {
    const r = await runCleanup(
      batch({ issues: [issue({ id: "b", stateType: "started" })] }),
      { now: fixedNow },
    );
    expect(r.closed).toBe(false);
    expect(r.state).toBe("open");
    expect(r.summary).toBeNull();
  });
});

describe("buildCleanupSummary", () => {
  it("lists completed, exclusions, blockers and duplicates with no secrets", () => {
    const b = batch({
      acceptedExclusions: ["b"],
      issues: [
        issue({ id: "a", identifier: "UNI-1", stateType: "completed" }),
        issue({
          id: "b",
          identifier: "UNI-2",
          stateType: "unstarted",
          labels: ["pi-dev:blocked-reason:credentials"],
        }),
      ],
    });
    const summary = buildCleanupSummary(assessBatch(b), b, {
      runner: "pi-dev-autopilot",
      at: "2026-06-16T12:00:00.000Z",
    });
    expect(summary).toContain("UNI-1");
    expect(summary).toContain("Accepted exclusions: UNI-2");
    expect(summary).not.toMatch(/api[_-]?key|secret|token/i);
  });
});
