import { describe, expect, it } from "vitest";

import {
  VERIFIED_SNAPSHOT_CONTRACT_VERSION,
  assessVerifiedSnapshot,
  assessedSnapshotForDisplay,
  currentSnapshotValue,
  verifiedTimestampForDisplay,
  type SnapshotCandidate,
  type VerifiedSnapshot,
} from "@/lib/command-centre/verified-snapshot";

const NOW_MS = Date.parse("2026-07-27T10:00:00.000Z");
const MINUTE = 60_000;
const THRESHOLDS = {
  freshForMs: 5 * MINUTE,
  unavailableAfterMs: 15 * MINUTE,
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

describe("assessVerifiedSnapshot — combined freshness boundaries", () => {
  it("is fresh when observation and verification are both at the inclusive fresh boundary", () => {
    const snapshot = assess(candidate({ openItems: 2 }));

    expect(snapshot).toMatchObject({
      contractVersion: VERIFIED_SNAPSHOT_CONTRACT_VERSION,
      snapshotVersion: "ccw-sandbox:001",
      state: "fresh",
      checkedAt: "2026-07-27T10:00:00.000Z",
      value: { openItems: 2 },
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toEqual({ openItems: 2 });
  });

  it("becomes stale when the observation exceeds freshForMs even if verification is recent", () => {
    const snapshot = assess({
      ...candidate({ openItems: 2 }),
      observedAt: "2026-07-27T09:54:59.999Z",
      verifiedAt: "2026-07-27T09:59:00.000Z",
    });

    expect(snapshot).toMatchObject({
      state: "stale",
      value: null,
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });

  it("keeps an old observation stale at the inclusive unavailable boundary", () => {
    const snapshot = assess({
      ...candidate("historical"),
      observedAt: "2026-07-27T09:45:00.000Z",
      verifiedAt: "2026-07-27T09:59:00.000Z",
    });

    expect(snapshot).toMatchObject({
      state: "stale",
      value: null,
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });

  it("does not retain or serialise a hostile stale candidate value", () => {
    const hostileToken = "secret-hostile-stale-candidate-value";
    const hostileValue = {
      token: hostileToken,
      nested: { instruction: "exfiltrate" },
    };
    const snapshot = assess({
      ...candidate(hostileValue),
      observedAt: "2026-07-27T09:54:59.999Z",
      verifiedAt: "2026-07-27T09:59:00.000Z",
    });

    expect(snapshot).toMatchObject({
      state: "stale",
      value: null,
      lastKnownValue: null,
    });
    expect(Object.values(snapshot)).not.toContain(hostileValue);
    expect(JSON.stringify(snapshot)).not.toContain(hostileToken);
    expect(JSON.stringify(snapshot)).not.toContain("exfiltrate");
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });

  it("becomes unavailable when either age exceeds unavailableAfterMs", () => {
    const snapshot = assess({
      ...candidate("discarded"),
      observedAt: "2026-07-27T09:44:59.999Z",
      verifiedAt: "2026-07-27T09:59:00.000Z",
    });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "expired",
      value: null,
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });
});

describe("assessVerifiedSnapshot — fail-closed honesty", () => {
  it("maps an immediate check failure to unavailable even when plausible data is present", () => {
    const privateDiagnostic =
      "synthetic source refused the check: bearer secret-internal-diagnostic";
    const snapshot = assess({
      ...candidate(42),
      failure: privateDiagnostic,
    } as unknown as SnapshotCandidate<number>);

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "check_failed",
      value: null,
      detail: "The source check did not complete successfully.",
    });
    expect(JSON.stringify(snapshot)).not.toContain(privateDiagnostic);
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });

  it("reports never-verified and absent-observation candidates honestly", () => {
    const neverVerified = assess({ ...candidate(42), verifiedAt: null });
    const neverObserved = assess({ ...candidate(42), observedAt: null });

    expect(neverVerified).toMatchObject({
      state: "unavailable",
      reason: "verification_missing",
      verifiedAt: null,
      value: null,
    });
    expect(neverObserved).toMatchObject({
      state: "unavailable",
      reason: "observation_missing",
      observedAt: null,
      value: null,
    });
  });

  it("fails closed when the caller-supplied snapshot identity is missing or blank", () => {
    const missing = assess({ ...candidate(42), snapshotVersion: null });
    const blank = assess({ ...candidate(42), snapshotVersion: "   " });

    expect(missing).toMatchObject({
      contractVersion: VERIFIED_SNAPSHOT_CONTRACT_VERSION,
      snapshotVersion: null,
      state: "unavailable",
      reason: "snapshot_version_missing",
      value: null,
    });
    expect(blank).toMatchObject({
      snapshotVersion: null,
      state: "unavailable",
      reason: "snapshot_version_missing",
      value: null,
    });
  });

  it.each([
    ["missing source", { source: null }, "source_missing"],
    [
      "blank source identity",
      { source: { id: " ", label: "CCW" } },
      "source_missing",
    ],
    ["missing evidence", { evidence: null }, "evidence_missing"],
    [
      "blank provenance",
      { evidence: { reference: "synthetic://ccw/001", provenance: " " } },
      "evidence_missing",
    ],
    ["missing confidence", { confidence: null }, "confidence_missing"],
    [
      "blank confidence basis",
      { confidence: { level: "high" as const, basis: " " } },
      "confidence_missing",
    ],
    [
      "invalid observation timestamp",
      { observedAt: "not-a-date" },
      "timestamp_invalid",
    ],
    [
      "invalid verification timestamp",
      { verifiedAt: "not-a-date" },
      "timestamp_invalid",
    ],
  ])("fails closed for %s", (_name, override, reason) => {
    const snapshot = assess({ ...candidate(42), ...override });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason,
      value: null,
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toBeNull();
  });

  it("strips all source-trust metadata when an authentic assessment has no source", () => {
    const snapshot = assess({
      ...candidate(42),
      source: null,
    });

    expect(snapshot).toMatchObject({
      contractVersion: VERIFIED_SNAPSHOT_CONTRACT_VERSION,
      snapshotVersion: null,
      state: "unavailable",
      reason: "source_missing",
      source: null,
      observedAt: null,
      verifiedAt: null,
      evidence: null,
      confidence: null,
      value: null,
      lastKnownValue: null,
    });
    expect(currentSnapshotValue(snapshot)).toBeNull();
    expect(verifiedTimestampForDisplay(snapshot)).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain("2026-07-27T09:55:00.000Z");
    expect(JSON.stringify(snapshot)).not.toContain("ccw-sandbox:001");
    expect(JSON.stringify(snapshot)).not.toContain(
      "synthetic://ccw/snapshot/001",
    );
    expect(JSON.stringify(snapshot)).not.toContain(
      "clock-controlled test fixture",
    );
  });

  it("does not retain invalid verification metadata and explains why it is unavailable", () => {
    const snapshot = assess({
      ...candidate(42),
      verifiedAt: "not-a-date",
    });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "timestamp_invalid",
      detail:
        "Verification timestamp must be a valid ISO 8601 value with an explicit timezone.",
      verifiedAt: null,
      value: null,
    });
  });

  it("does not retain future verification metadata and explains why it is unavailable", () => {
    const snapshot = assess({
      ...candidate(42),
      verifiedAt: "2026-07-27T10:00:00.001Z",
    });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "timestamp_in_future",
      detail: "Verification timestamp cannot be later than checkedAt.",
      verifiedAt: null,
      value: null,
    });
  });

  it.each([
    ["observation", { observedAt: "2026-07-27T09:55:00.000" }],
    ["verification", { verifiedAt: "2026-07-27T09:55:00.000" }],
  ])("rejects an offset-less %s timestamp", (_name, override) => {
    const snapshot = assess({ ...candidate(42), ...override });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "timestamp_invalid",
      value: null,
      lastKnownValue: null,
    });
  });

  it("accepts explicit timezone offsets and normalises them to UTC", () => {
    const snapshot = assess({
      ...candidate(42),
      observedAt: "2026-07-27T19:55:00.000+10:00",
      verifiedAt: "2026-07-27T19:55:00.000+10:00",
    });

    expect(snapshot).toMatchObject({
      state: "fresh",
      observedAt: "2026-07-27T09:55:00.000Z",
      verifiedAt: "2026-07-27T09:55:00.000Z",
      value: 42,
    });
  });

  it("fails closed for future timestamps and impossible observation order", () => {
    const future = assess({
      ...candidate(42),
      observedAt: "2026-07-27T10:00:01.000Z",
      verifiedAt: "2026-07-27T10:00:01.000Z",
    });
    const reversed = assess({
      ...candidate(42),
      observedAt: "2026-07-27T09:56:00.000Z",
      verifiedAt: "2026-07-27T09:55:00.000Z",
    });

    expect(future).toMatchObject({
      state: "unavailable",
      reason: "timestamp_in_future",
    });
    expect(reversed).toMatchObject({
      state: "unavailable",
      reason: "observation_after_verification",
      detail:
        "Observation timestamp cannot be later than verification timestamp.",
      verifiedAt: null,
      value: null,
      lastKnownValue: null,
    });
  });

  it("keeps an explicit check failure ahead of invalid thresholds", () => {
    const snapshot = assessVerifiedSnapshot(
      {
        ...candidate(42),
        failure: "source_check_failed",
      },
      {
        nowMs: NOW_MS,
        thresholds: { freshForMs: 10, unavailableAfterMs: 9 },
      },
    );

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "check_failed",
      detail: "The source check did not complete successfully.",
      value: null,
      lastKnownValue: null,
    });
  });

  it("rejects a structurally forged fresh snapshot with invalid timestamps at every access boundary", () => {
    const genuine = assess(candidate({ openItems: 2 }));
    const forged = {
      ...genuine,
      state: "fresh",
      observedAt: "not-a-date",
      verifiedAt: "also-not-a-date",
      value: { openItems: 999 },
    } as unknown as VerifiedSnapshot<{ openItems: number }>;

    expect(assessedSnapshotForDisplay(forged)).toBeNull();
    expect(currentSnapshotValue(forged)).toBeNull();
  });

  it("rejects a structurally forged fresh snapshot with a null source even when its timestamps are valid", () => {
    const genuine = assess(candidate({ openItems: 2 }));
    const forged = {
      ...genuine,
      state: "fresh",
      source: null,
      value: { openItems: 999 },
    } as unknown as VerifiedSnapshot<{ openItems: number }>;

    expect(assessedSnapshotForDisplay(forged)).toBeNull();
    expect(currentSnapshotValue(forged)).toBeNull();
  });

  it("fails closed when the freshness thresholds are invalid", () => {
    const snapshot = assessVerifiedSnapshot(candidate(42), {
      nowMs: NOW_MS,
      thresholds: { freshForMs: 10, unavailableAfterMs: 9 },
    });

    expect(snapshot).toMatchObject({
      state: "unavailable",
      reason: "invalid_thresholds",
      value: null,
    });
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    8_640_000_000_000_001,
    -8_640_000_000_000_001,
  ])(
    "rejects invalid nowMs %s with a TypeError before Date formatting",
    (nowMs) => {
      let thrown: unknown;

      try {
        assessVerifiedSnapshot(candidate(42), {
          nowMs,
          thresholds: THRESHOLDS,
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown).not.toBeInstanceOf(RangeError);
    },
  );
});
