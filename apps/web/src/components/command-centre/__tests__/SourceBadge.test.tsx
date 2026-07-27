import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceBadge, type SourceBadgeProps } from "../SourceBadge";
import {
  assessVerifiedSnapshot,
  type SnapshotCandidate,
  type VerifiedSnapshot,
} from "@/lib/command-centre/verified-snapshot";

const NOW_MS = Date.parse("2026-07-27T10:00:00.000Z");
const THRESHOLDS = {
  freshForMs: 5 * 60_000,
  unavailableAfterMs: 15 * 60_000,
} as const;

function candidate<T>(value: T): SnapshotCandidate<T> {
  return {
    snapshotVersion: "ccw-sandbox:001",
    source: { id: "ccw-sandbox", label: "CCW sandbox proof" },
    observedAt: "2026-07-27T09:55:00.000Z",
    verifiedAt: "2026-07-27T09:55:00.000Z",
    evidence: {
      reference: "synthetic://ccw/snapshot/001",
      provenance: "clock-controlled test fixture",
    },
    confidence: {
      level: "high",
      basis: "all required synthetic fields were verified",
    },
    value,
  };
}

function assess<T>(input: SnapshotCandidate<T>, nowMs: number = NOW_MS) {
  return assessVerifiedSnapshot(input, { nowMs, thresholds: THRESHOLDS });
}

describe("SourceBadge — verified snapshot contract", () => {
  it("shows fresh state, source, checked time, verified time, and accessible provenance", () => {
    const snapshot = assess(candidate({ openItems: 2 }));

    render(<SourceBadge snapshot={snapshot} />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-source-mode", "fresh");
    expect(badge).toHaveAttribute("data-source-state", "fresh");
    expect(badge).not.toHaveAttribute("aria-label");
    expect(screen.getByText("CCW sandbox proof")).toBeInTheDocument();
    expect(screen.getByTestId("source-checked-at")).toHaveTextContent(
      "checked 2026-07-27T10:00:00.000Z",
    );
    expect(screen.getByTestId("source-verified-at")).toHaveTextContent(
      "verified 2026-07-27T09:55:00.000Z",
    );
    const accessibleDetail = screen.getByTestId("source-accessible-detail");
    expect(accessibleDetail).toHaveTextContent(
      /Evidence synthetic:\/\/ccw\/snapshot\/001/i,
    );
    expect(accessibleDetail).toHaveTextContent(/Snapshot ccw-sandbox:001/i);
    expect(accessibleDetail).toHaveTextContent(
      /Provenance clock-controlled test fixture/i,
    );
    expect(accessibleDetail).toHaveTextContent(/Confidence high/i);
    expect(accessibleDetail).toHaveTextContent(
      /Basis all required synthetic fields were verified/i,
    );
  });

  it("shows stale state without describing the historical value as current", () => {
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      observedAt: "2026-07-27T09:54:59.999Z",
      verifiedAt: "2026-07-27T09:59:00.000Z",
    });

    render(<SourceBadge snapshot={snapshot} />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-source-state", "stale");
    expect(badge).not.toHaveTextContent(/current value/i);
    expect(screen.getByTestId("source-checked-at")).toBeInTheDocument();
    expect(screen.getByTestId("source-verified-at")).toBeInTheDocument();
  });

  it("shows only assessment-safe metadata for an authentic unavailable absent source", () => {
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      source: null,
    });

    render(<SourceBadge snapshot={snapshot} />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-source-mode", "unavailable");
    expect(badge).toHaveAttribute("data-source-state", "unavailable");
    expect(screen.getByText("source unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("source-checked-at")).toHaveTextContent(
      "checked 2026-07-27T10:00:00.000Z",
    );
    expect(screen.getByTestId("source-never-verified")).toHaveTextContent(
      "never verified",
    );
    expect(screen.getByTestId("source-unavailable-reason")).toHaveTextContent(
      "source missing",
    );
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Reason source missing/i,
    );
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Snapshot identity unavailable/i,
    );
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /No observation recorded/i,
    );
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Evidence unavailable/i,
    );
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Confidence unavailable/i,
    );
    expect(screen.queryByTestId("source-verified-at")).not.toBeInTheDocument();
    expect(badge).not.toHaveTextContent(/2026-07-27T09:55:00.000Z/i);
    expect(badge).not.toHaveTextContent(/synthetic:\/\/ccw\/snapshot\/001/i);
    expect(badge).not.toHaveTextContent(/clock-controlled test fixture/i);
    expect(badge).not.toHaveTextContent(/updated|current value/i);
  });

  it("renders and announces the unavailable reason without retaining an invalid verification time", () => {
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      verifiedAt: "not-a-date",
    });

    render(<SourceBadge snapshot={snapshot} />);

    const badge = screen.getByRole("status");
    expect(screen.getByTestId("source-never-verified")).toBeInTheDocument();
    expect(screen.getByTestId("source-unavailable-reason")).toHaveTextContent(
      "timestamp invalid: Verification timestamp must be a valid ISO 8601 value with an explicit timezone.",
    );
    expect(screen.queryByText(/not-a-date/i)).not.toBeInTheDocument();
    const accessibleDetail = screen.getByTestId("source-accessible-detail");
    expect(accessibleDetail).toHaveTextContent(/Never verified/i);
    expect(accessibleDetail).toHaveTextContent(/Reason timestamp invalid/i);
    expect(accessibleDetail).not.toHaveTextContent(/Verified at not-a-date/i);
  });

  it("never presents a relationally invalid verification time as verified", () => {
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      observedAt: "2026-07-27T09:56:00.000Z",
      verifiedAt: "2026-07-27T09:55:00.000Z",
    });

    const { rerender } = render(<SourceBadge snapshot={snapshot} />);

    let badge = screen.getByRole("status");
    expect(snapshot).toMatchObject({
      reason: "observation_after_verification",
      verifiedAt: null,
    });
    expect(screen.getByTestId("source-never-verified")).toBeInTheDocument();
    expect(screen.queryByTestId("source-verified-at")).not.toBeInTheDocument();
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Never verified/i,
    );
    expect(
      screen.getByTestId("source-accessible-detail"),
    ).not.toHaveTextContent(/Verified at 2026-07-27T09:55:00.000Z/i);

    const forged = {
      ...snapshot,
      verifiedAt: "2026-07-27T09:55:00.000Z",
    };
    rerender(<SourceBadge snapshot={forged} />);

    badge = screen.getByRole("status");
    expect(screen.getByTestId("source-unassessed")).toBeInTheDocument();
    expect(
      screen.queryByTestId("source-never-verified"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("source-verified-at")).not.toBeInTheDocument();
    expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
      /Snapshot assessment unavailable/i,
    );
    expect(badge).not.toHaveTextContent(
      /Verified at 2026-07-27T09:55:00.000Z/i,
    );
  });

  it.each([
    ["invalid", "not-a-date"],
    ["future", "2026-07-27T10:00:00.001Z"],
  ])(
    "guards against a forged %s verification time at the rendering boundary",
    (_name, verifiedAt) => {
      const unavailable = assess({
        ...candidate({ openItems: 2 }),
        source: null,
      });
      const forged = { ...unavailable, verifiedAt };

      render(<SourceBadge snapshot={forged} />);

      const badge = screen.getByRole("status");
      expect(screen.getByTestId("source-unassessed")).toBeInTheDocument();
      expect(screen.queryByText(verifiedAt)).not.toBeInTheDocument();
      expect(badge).not.toHaveTextContent(
        new RegExp(`Verified at ${verifiedAt}`),
      );
    },
  );

  it.each([
    [
      "invalid timestamps",
      {
        observedAt: "not-a-date",
        verifiedAt: "also-not-a-date",
      },
    ],
    [
      "a missing source",
      {
        source: null,
      },
    ],
  ])(
    "renders a forged fresh snapshot with %s as unassessed and exposes no trusted metadata",
    (_name, override) => {
      const genuine = assess(candidate({ openItems: 2 }));
      const forged = {
        ...genuine,
        state: "fresh",
        value: { openItems: 999 },
        ...override,
      } as unknown as VerifiedSnapshot<{ openItems: number }>;

      render(<SourceBadge snapshot={forged} />);

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("data-source-mode", "unavailable");
      expect(badge).toHaveAttribute("data-source-state", "unavailable");
      expect(screen.getByText("source unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("source-unassessed")).toBeInTheDocument();
      expect(screen.queryByText("CCW sandbox proof")).not.toBeInTheDocument();
      expect(screen.queryByTestId("source-checked-at")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("source-verified-at"),
      ).not.toBeInTheDocument();
      expect(badge).not.toHaveTextContent(/synthetic:\/\/ccw\/snapshot\/001/i);
      expect(badge).not.toHaveTextContent(/clock-controlled test fixture/i);
      expect(badge).not.toHaveTextContent(/999/);
    },
  );

  it("never copies raw source failure diagnostics into the DOM or accessibility text", () => {
    const privateDiagnostic =
      "request failed with bearer secret-internal-diagnostic";
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      failure: privateDiagnostic,
    } as unknown as SnapshotCandidate<{ openItems: number }>);

    render(<SourceBadge snapshot={snapshot} />);

    const badge = screen.getByRole("status");
    expect(screen.getByTestId("source-unavailable-reason")).toHaveTextContent(
      "check failed: The source check did not complete successfully.",
    );
    expect(badge).not.toHaveTextContent(privateDiagnostic);
    expect(
      screen.getByTestId("source-accessible-detail"),
    ).not.toHaveTextContent(privateDiagnostic);
  });

  it("keeps legacy live and seed modes and attributes compatible", () => {
    const { rerender } = render(
      <SourceBadge
        mode="live"
        label="legacy source"
        lastUpdatedAt="2026-07-27T09:59:00.000Z"
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute(
      "data-source-mode",
      "live",
    );

    rerender(<SourceBadge mode="seed" label="legacy seed source" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-source-mode",
      "seed",
    );
  });

  it.each(["fresh", "stale", "unavailable", "verified-like"])(
    "fails closed for the runtime-forged legacy mode %s",
    (mode) => {
      const forgedProps = {
        mode,
        label: "runtime-forged source",
        lastUpdatedAt: "2026-07-27T09:59:00.000Z",
      } as unknown as SourceBadgeProps;

      render(<SourceBadge {...forgedProps} />);

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("data-source-mode", "unavailable");
      expect(badge).toHaveAttribute("data-source-state", "unavailable");
      expect(screen.getByText("source unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("source-mode-rejected")).toHaveTextContent(
        "source mode rejected",
      );
      expect(screen.getByTestId("source-accessible-detail")).toHaveTextContent(
        /Source mode unavailable/i,
      );
      expect(badge).not.toHaveTextContent(/runtime-forged source/i);
      expect(badge).not.toHaveTextContent(/ago/i);
      expect(
        screen.queryByTestId("source-verified-at"),
      ).not.toBeInTheDocument();
    },
  );
});
