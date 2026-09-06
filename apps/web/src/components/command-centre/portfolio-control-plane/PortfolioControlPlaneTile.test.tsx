import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortfolioControlPlaneTile } from "./PortfolioControlPlaneTile";
import type { PortfolioControlPlaneProjection } from "@/lib/command-centre/portfolio-control-plane";

afterEach(() => vi.unstubAllGlobals());

function projection(): PortfolioControlPlaneProjection {
  return {
    schema: "nexus.portfolio.control-plane.projection.v1",
    generatedAt: "2026-09-06T06:10:00.000Z",
    mode: "read_only_local_candidate",
    remoteDispatchEnabled: false,
    repositoryReconciliationEnabled: false,
    externalMutationEnabled: false,
    registry: {
      state: "observed",
      version: "2026-09-06.1",
      authority: ".portfolio/CONTROL-PLANE.v1.json",
      reason: "control-plane evidence precedence",
    },
    baseline: {
      state: "baseline_in_progress",
      baselineId: "baseline-1",
      recordedAt: "2026-09-06T06:10:00.000Z",
      evidenceSnapshotHash: "c".repeat(64),
      reason: "Unchecked remote machines remain unverified.",
    },
    summary: { observed: 1, stale: 0, offline: 1, quarantined: 1, unproven: 1 },
    repositories: [
      {
        projectId: "restoreassist",
        repositoryId: "CleanExpo/RestoreAssist",
        state: "quarantined",
        revision: "a".repeat(40),
        branch: "docs/wip",
        worktreeRole: "canonical_root",
        drift: "tracked_changes",
        evidenceAt: "2026-09-06T06:09:00.000Z",
        evidenceFreshness: "fresh",
        blocker:
          "Fresh evidence shows a checkout that is not eligible for automatic reconciliation.",
        nextSafeAction: "Preserve the checkout.",
        provenance: "signed_device_attestation",
      },
      {
        projectId: "unite-group",
        repositoryId: "CleanExpo/Unite-Group",
        state: "observed",
        revision: "b".repeat(40),
        branch: "main",
        worktreeRole: "isolated_worktree",
        drift: "clean_at_observed_revision",
        evidenceAt: "2026-09-06T06:09:00.000Z",
        evidenceFreshness: "fresh",
        blocker: null,
        nextSafeAction: "Independent review only.",
        provenance: "signed_device_attestation",
      },
    ],
    devices: [
      {
        deviceId: "macbook",
        label: "MacBook",
        state: "offline",
        heartbeatAt: "2026-09-06T05:00:00.000Z",
        operatingStatus: "offline",
        enrolmentState: "enrolled",
        newExecutionEligible: false,
        worker: null,
        leaseState: "expired",
        durableJob: {
          jobId: "job-1",
          objective: "Build drift visibility",
          state: "paused_offline",
          checkpoint: {
            stage: "verify",
            currentWork: "Run tests",
            evidenceRefs: ["receipt:test"],
          },
          blocker: null,
          nextAction: "Obtain a new fenced lease.",
        },
        reason: "Heartbeat expired.",
      },
    ],
    unknownWork: [],
    nextSafeAction: "Preserve quarantined work.",
  };
}

describe("PortfolioControlPlaneTile", () => {
  it("shows only exceptions by default and keeps offline durable work visible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => projection() }),
    );
    render(<PortfolioControlPlaneTile />);
    await waitFor(() =>
      expect(
        screen.getByText(
          /baseline in progress · 0 enrolled · 0 active · 0 stale · 1 offline · 0 unknown/,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("CleanExpo/RestoreAssist")).toBeInTheDocument();
    expect(screen.queryByText("CleanExpo/Unite-Group")).not.toBeInTheDocument();
    expect(screen.getByTestId("portfolio-device-macbook")).toHaveTextContent(
      "MacBook · offline · Build drift visibility",
    );
    expect(
      screen.getByText(
        /dispatch off · reconciliation off · external mutation off/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("portfolio-baseline-status")).toHaveTextContent(
      "Baseline baseline in progress",
    );
  });

  it("does not invent fallback state after an API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    render(<PortfolioControlPlaneTile />);
    expect(
      await screen.findByText(
        "Control-plane status unavailable. No fallback state is being shown.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/observed ·/)).not.toBeInTheDocument();
  });
});
