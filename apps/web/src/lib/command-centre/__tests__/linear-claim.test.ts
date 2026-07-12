import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AUTONOMOUS_LABELS,
  BLOCKED_LABEL_PREFIX,
  evaluateEligibility,
  hasAcceptanceCriteria,
  hasAutonomousLabel,
  isBlocked,
  isEligibleState,
  selectNextClaimable,
  type ClaimCandidate,
} from "@/lib/command-centre/linear-claim";

const ACCEPTANCE = "## Acceptance Criteria\n* Historical classification only.";

function candidate(overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    id: "linear-id",
    identifier: "UNI-1000",
    title: "Legacy autonomous-labelled projection",
    priority: 2,
    description: ACCEPTANCE,
    createdAt: "2026-06-16T07:48:00.000Z",
    url: "https://linear.app/unite-group/issue/UNI-1000",
    stateName: "Todo",
    stateType: "unstarted",
    labels: ["pi-dev:autonomous"],
    blockedByOpenCount: 0,
    ...overrides,
  };
}

describe("legacy Linear projection predicates", () => {
  it("recognises the two historical labels case-insensitively", () => {
    expect(hasAutonomousLabel({ labels: ["pi-dev:autonomous"] })).toBe(true);
    expect(hasAutonomousLabel({ labels: ["MESH:AUTO"] })).toBe(true);
    expect(hasAutonomousLabel({ labels: ["source:crm-work-packet"] })).toBe(
      false,
    );
    expect([...AUTONOMOUS_LABELS]).toEqual(["mesh:auto", "pi-dev:autonomous"]);
  });

  it("classifies state, blockers, and acceptance headings without I/O", () => {
    expect(isEligibleState({ stateType: "unstarted" })).toBe(true);
    expect(isEligibleState({ stateType: "started" })).toBe(false);
    expect(
      isBlocked({
        labels: [`${BLOCKED_LABEL_PREFIX}credentials`],
        blockedByOpenCount: 0,
      }),
    ).toBe(true);
    expect(isBlocked({ labels: [], blockedByOpenCount: 1 })).toBe(true);
    expect(hasAcceptanceCriteria({ description: ACCEPTANCE })).toBe(true);
    expect(hasAcceptanceCriteria({ description: "No heading" })).toBe(false);
  });

  it("reports the first historical eligibility reason", () => {
    expect(evaluateEligibility(candidate())).toEqual({
      claimable: true,
      reason: "eligible",
    });
    expect(
      evaluateEligibility(candidate({ labels: ["source:crm-work-packet"] })),
    ).toEqual({
      claimable: false,
      reason: "not-autonomous",
    });
    expect(evaluateEligibility(candidate({ stateType: "started" }))).toEqual({
      claimable: false,
      reason: "ineligible-state",
    });
  });

  it("retains deterministic priority/FIFO classification for migration inventory", () => {
    const older = candidate({
      identifier: "UNI-OLD",
      priority: 2,
      createdAt: "2026-06-16T07:00:00.000Z",
    });
    const newer = candidate({
      identifier: "UNI-NEW",
      priority: 2,
      createdAt: "2026-06-16T09:00:00.000Z",
    });
    const urgent = candidate({ identifier: "UNI-URGENT", priority: 1 });
    expect(selectNextClaimable([newer, older]).next?.identifier).toBe(
      "UNI-OLD",
    );
    expect(selectNextClaimable([older, urgent]).next?.identifier).toBe(
      "UNI-URGENT",
    );
  });

  it("is structurally disconnected from environment gates, packets, and mutation dependencies", () => {
    const source = readFileSync(
      new URL("../linear-claim.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /process\.env|LinearExecutionPacket|buildClaimReceipt|moveToInProgress|postComment|updateIssueState/,
    );
    expect(source).not.toMatch(/^import\s/m);
  });
});
