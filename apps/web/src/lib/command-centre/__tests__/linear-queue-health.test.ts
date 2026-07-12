import { describe, expect, it } from "vitest";
import {
  buildConfigReadiness,
  computeQueueHealth,
} from "@/lib/command-centre/linear-queue-health";
import type { ClaimCandidate } from "@/lib/command-centre/linear-claim";

function candidate(overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    id: "linear-id",
    identifier: "UNI-1000",
    title: "Legacy labelled projection",
    priority: 2,
    description: "## Acceptance Criteria\n- historical only",
    createdAt: "2026-06-16T07:48:00.000Z",
    url: "https://linear.app/unite-group/issue/UNI-1000",
    stateName: "Todo",
    stateType: "unstarted",
    labels: ["pi-dev:autonomous"],
    blockedByOpenCount: 0,
    ...overrides,
  };
}

describe("legacy Linear projection inventory", () => {
  it("reports configuration presence without returning the secret", () => {
    const config = buildConfigReadiness({
      linearKey: "sentinel-linear-secret",
      teamKey: "UNI",
      projectName: "Unite-Group",
    });

    expect(config).toEqual({
      linearKeyPresent: true,
      teamConfigured: true,
      projectConfigured: true,
      inventoryConfigured: true,
    });
    expect(JSON.stringify(config)).not.toContain("sentinel-linear-secret");
  });

  it("is unconfigured without a key but still makes execution impossible", () => {
    const report = computeQueueHealth({
      config: buildConfigReadiness({
        linearKey: "",
        teamKey: "UNI",
        projectName: "Unite-Group",
      }),
      candidates: [],
    });

    expect(report).toMatchObject({
      state: "unconfigured",
      authority: "crm-ownest",
      executionEnabled: false,
      legacyLabelledProjectionCount: 0,
    });
  });

  it("reports labelled and blocked projection counts without claimability or stale semantics", () => {
    const report = computeQueueHealth({
      config: buildConfigReadiness({
        linearKey: "configured",
        teamKey: "UNI",
        projectName: "Unite-Group",
      }),
      candidates: [
        candidate(),
        candidate({
          identifier: "UNI-1001",
          labels: ["pi-dev:autonomous", "pi-dev:blocked-reason:credentials"],
        }),
      ],
    });

    expect(report).toEqual({
      state: "retired",
      summary:
        "Legacy Linear executor retired; 2 labelled projection(s) remain for inventory only.",
      authority: "crm-ownest",
      executionEnabled: false,
      config: {
        linearKeyPresent: true,
        teamConfigured: true,
        projectConfigured: true,
        inventoryConfigured: true,
      },
      legacyLabelledProjectionCount: 2,
      blockedProjectionCount: 1,
    });
    expect(report).not.toHaveProperty("nextClaimable");
    expect(report).not.toHaveProperty("lastClaimedAt");
    expect(report).not.toHaveProperty("isStale");
  });
});
