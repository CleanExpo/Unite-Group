// Pure honesty contract for Mission Control snapshots.
//
// This module performs no collection, polling, persistence, or external I/O.
// It classifies an already-observed synthetic or real candidate at an injected
// point in time. Only a fresh snapshot exposes a caller-supplied `value`;
// stale and unavailable data expose neither current nor last-known values.

export const VERIFIED_SNAPSHOT_CONTRACT_VERSION = 1 as const;

export type SnapshotState = "fresh" | "stale" | "unavailable";
export type SnapshotConfidenceLevel = "low" | "medium" | "high";

export interface SnapshotSourceIdentity {
  readonly id: string;
  readonly label: string;
}

export interface SnapshotEvidence {
  readonly reference: string;
  readonly provenance: string;
}

export interface SnapshotConfidence {
  readonly level: SnapshotConfidenceLevel;
  readonly basis: string;
}

declare const verifiedSnapshotBrand: unique symbol;

interface VerifiedSnapshotBrand {
  /**
   * Type-only opaque brand. Runtime authenticity is enforced separately by
   * the module-private assessedSnapshots registry.
   */
  readonly [verifiedSnapshotBrand]: true;
}

interface SnapshotBase extends VerifiedSnapshotBrand {
  /** Schema version for this contract, independent of the snapshot identity. */
  readonly contractVersion: typeof VERIFIED_SNAPSHOT_CONTRACT_VERSION;
  /** Time this contract evaluated the candidate, derived from injected nowMs. */
  readonly checkedAt: string;
}

interface VerifiedSnapshotBase extends SnapshotBase {
  /** Caller-supplied immutable identity binding this snapshot to its evidence. */
  readonly snapshotVersion: string;
  readonly source: SnapshotSourceIdentity;
  readonly observedAt: string;
  readonly verifiedAt: string;
  readonly evidence: SnapshotEvidence;
  readonly confidence: SnapshotConfidence;
}

export interface FreshVerifiedSnapshot<T> extends VerifiedSnapshotBase {
  readonly state: "fresh";
  readonly value: T;
  readonly lastKnownValue: null;
}

export interface StaleVerifiedSnapshot extends VerifiedSnapshotBase {
  readonly state: "stale";
  /** Stale observations expose no caller-supplied current or historical value. */
  readonly value: null;
  readonly lastKnownValue: null;
}

export type SnapshotUnavailableReason =
  | "check_failed"
  | "expired"
  | "invalid_thresholds"
  | "snapshot_version_missing"
  | "source_missing"
  | "evidence_missing"
  | "confidence_missing"
  | "observation_missing"
  | "verification_missing"
  | "value_missing"
  | "timestamp_invalid"
  | "timestamp_in_future"
  | "observation_after_verification";

/**
 * Public details are deliberately closed literals. Caller diagnostics may
 * contain secrets or internal implementation detail and must never cross the
 * snapshot/UI boundary.
 */
export type SnapshotUnavailableDetail =
  | "The source check did not complete successfully."
  | "Observation timestamp must be a valid ISO 8601 value with an explicit timezone."
  | "Verification timestamp must be a valid ISO 8601 value with an explicit timezone."
  | "Observation timestamp cannot be later than checkedAt."
  | "Verification timestamp cannot be later than checkedAt."
  | "Observation timestamp cannot be later than verification timestamp.";

/** Closed caller-facing failure codes. Raw diagnostics belong outside this contract. */
export type SnapshotCheckFailureReason =
  | "source_check_failed"
  | "source_unreachable"
  | "source_rejected"
  | "response_invalid";

export interface UnavailableVerifiedSnapshot extends SnapshotBase {
  /** Unavailable assessments expose no caller-supplied trusted metadata. */
  readonly snapshotVersion: null;
  readonly state: "unavailable";
  readonly value: null;
  readonly lastKnownValue: null;
  readonly source: null;
  readonly observedAt: null;
  readonly verifiedAt: null;
  readonly evidence: null;
  readonly confidence: null;
  readonly reason: SnapshotUnavailableReason;
  readonly detail?: SnapshotUnavailableDetail;
}

export type VerifiedSnapshot<T> =
  | FreshVerifiedSnapshot<T>
  | StaleVerifiedSnapshot
  | UnavailableVerifiedSnapshot;

export interface SnapshotCandidate<T> {
  /** Required immutable identity for this particular snapshot/evidence set. */
  readonly snapshotVersion: string | null;
  readonly source?: Partial<SnapshotSourceIdentity> | null;
  readonly observedAt?: string | null;
  readonly verifiedAt?: string | null;
  readonly evidence?: Partial<SnapshotEvidence> | null;
  readonly confidence?: Partial<SnapshotConfidence> | null;
  readonly value?: T;
  /** A failed observation attempt always wins over otherwise plausible data. */
  readonly failure?: SnapshotCheckFailureReason | null;
}

export interface SnapshotFreshnessThresholds {
  /**
   * An observation and its verification exactly this old remain fresh.
   * Both ages must satisfy this boundary.
   */
  readonly freshForMs: number;
  /**
   * An observation and its verification exactly this old remain stale.
   * If either is older, the snapshot is unavailable.
   */
  readonly unavailableAfterMs: number;
}

export interface AssessVerifiedSnapshotOptions {
  /** Injected clock for deterministic, side-effect-free assessment. */
  readonly nowMs: number;
  readonly thresholds: SnapshotFreshnessThresholds;
}

interface ParsedTimestamp {
  readonly ms: number;
  readonly iso: string;
}

const MAX_DATE_MS = 8_640_000_000_000_000;
const assessedSnapshots = new WeakSet<object>();
const EXPLICIT_TIMEZONE_TIMESTAMP =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<fraction>\d{1,3}))?(?<timezone>Z|(?<offsetSign>[+-])(?<offsetHour>\d{2}):(?<offsetMinute>\d{2}))$/;

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normaliseSource(
  candidate: SnapshotCandidate<unknown>["source"],
): SnapshotSourceIdentity | null {
  if (!candidate || !nonBlank(candidate.id) || !nonBlank(candidate.label))
    return null;
  return Object.freeze({
    id: candidate.id.trim(),
    label: candidate.label.trim(),
  });
}

function normaliseEvidence(
  candidate: SnapshotCandidate<unknown>["evidence"],
): SnapshotEvidence | null {
  if (
    !candidate ||
    !nonBlank(candidate.reference) ||
    !nonBlank(candidate.provenance)
  )
    return null;
  return Object.freeze({
    reference: candidate.reference.trim(),
    provenance: candidate.provenance.trim(),
  });
}

function normaliseConfidence(
  candidate: SnapshotCandidate<unknown>["confidence"],
): SnapshotConfidence | null {
  if (
    !candidate ||
    !["low", "medium", "high"].includes(candidate.level ?? "") ||
    !nonBlank(candidate.basis)
  ) {
    return null;
  }
  return Object.freeze({
    level: candidate.level as SnapshotConfidenceLevel,
    basis: candidate.basis.trim(),
  });
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Parse only the deterministic ISO subset supported by this contract.
 * Offset-less strings are deliberately rejected because Date.parse interprets
 * them using host-dependent local-time rules.
 */
function parseTimestamp(
  value: string | null | undefined,
): ParsedTimestamp | null {
  if (!nonBlank(value)) return null;

  const match = EXPLICIT_TIMEZONE_TIMESTAMP.exec(value.trim());
  if (!match?.groups) return null;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute);
  const second = Number(match.groups.second);
  const offsetHour = Number(match.groups.offsetHour ?? 0);
  const offsetMinute = Number(match.groups.offsetMinute ?? 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    return null;
  }

  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_DATE_MS) return null;
  return Object.freeze({ ms: parsed, iso: new Date(parsed).toISOString() });
}

function finaliseAssessedSnapshot<T extends object>(
  snapshot: T,
): T & VerifiedSnapshotBrand {
  const finalised = Object.freeze(snapshot);
  assessedSnapshots.add(finalised);
  return finalised as T & VerifiedSnapshotBrand;
}

function isAssessedSnapshot(
  snapshot: unknown,
): snapshot is VerifiedSnapshot<unknown> {
  return (
    typeof snapshot === "object" &&
    snapshot !== null &&
    assessedSnapshots.has(snapshot)
  );
}

function unavailable(
  checkedAt: string,
  reason: SnapshotUnavailableReason,
  detail?: SnapshotUnavailableDetail,
): UnavailableVerifiedSnapshot {
  return finaliseAssessedSnapshot({
    contractVersion: VERIFIED_SNAPSHOT_CONTRACT_VERSION,
    snapshotVersion: null,
    state: "unavailable",
    value: null,
    lastKnownValue: null,
    checkedAt,
    source: null,
    observedAt: null,
    verifiedAt: null,
    evidence: null,
    confidence: null,
    reason,
    ...(detail ? { detail } : {}),
  });
}

function timestampDetail(
  kind: "Observation" | "Verification",
): SnapshotUnavailableDetail {
  return `${kind} timestamp must be a valid ISO 8601 value with an explicit timezone.`;
}

/**
 * Classify an observation without consulting a clock, source, or network.
 *
 * Failures and incomplete provenance are unavailable, never silently promoted
 * to a current value. Freshness uses the older of the observation and
 * verification ages: both must be within the inclusive fresh boundary; both
 * must be within the inclusive unavailable boundary to retain a stale value.
 */
export function assessVerifiedSnapshot<T>(
  candidate: SnapshotCandidate<T>,
  options: AssessVerifiedSnapshotOptions,
): VerifiedSnapshot<T> {
  if (
    !Number.isFinite(options.nowMs) ||
    Math.abs(options.nowMs) > MAX_DATE_MS
  ) {
    throw new TypeError(
      "nowMs must be a finite number within the JavaScript Date range",
    );
  }

  const checkedAt = new Date(options.nowMs).toISOString();
  const source = normaliseSource(candidate.source);
  const evidence = normaliseEvidence(candidate.evidence);
  const confidence = normaliseConfidence(candidate.confidence);

  if (candidate.failure !== null && candidate.failure !== undefined) {
    return unavailable(
      checkedAt,
      "check_failed",
      "The source check did not complete successfully.",
    );
  }

  const { freshForMs, unavailableAfterMs } = options.thresholds;
  if (
    !Number.isFinite(freshForMs) ||
    !Number.isFinite(unavailableAfterMs) ||
    freshForMs < 0 ||
    unavailableAfterMs < freshForMs
  ) {
    return unavailable(checkedAt, "invalid_thresholds");
  }
  if (!nonBlank(candidate.snapshotVersion)) {
    return unavailable(checkedAt, "snapshot_version_missing");
  }
  if (!source) return unavailable(checkedAt, "source_missing");
  if (!evidence) return unavailable(checkedAt, "evidence_missing");
  if (!confidence) return unavailable(checkedAt, "confidence_missing");
  if (!nonBlank(candidate.observedAt)) {
    return unavailable(checkedAt, "observation_missing");
  }
  if (!nonBlank(candidate.verifiedAt)) {
    return unavailable(checkedAt, "verification_missing");
  }
  if (candidate.value === undefined) {
    return unavailable(checkedAt, "value_missing");
  }

  const observed = parseTimestamp(candidate.observedAt);
  if (!observed) {
    return unavailable(
      checkedAt,
      "timestamp_invalid",
      timestampDetail("Observation"),
    );
  }
  const verified = parseTimestamp(candidate.verifiedAt);
  if (!verified) {
    return unavailable(
      checkedAt,
      "timestamp_invalid",
      timestampDetail("Verification"),
    );
  }
  if (observed.ms > options.nowMs) {
    return unavailable(
      checkedAt,
      "timestamp_in_future",
      "Observation timestamp cannot be later than checkedAt.",
    );
  }
  if (verified.ms > options.nowMs) {
    return unavailable(
      checkedAt,
      "timestamp_in_future",
      "Verification timestamp cannot be later than checkedAt.",
    );
  }
  if (observed.ms > verified.ms) {
    return unavailable(
      checkedAt,
      "observation_after_verification",
      "Observation timestamp cannot be later than verification timestamp.",
    );
  }

  const observationAgeMs = options.nowMs - observed.ms;
  const verificationAgeMs = options.nowMs - verified.ms;
  const freshnessAgeMs = Math.max(observationAgeMs, verificationAgeMs);
  const base = {
    contractVersion: VERIFIED_SNAPSHOT_CONTRACT_VERSION,
    snapshotVersion: candidate.snapshotVersion.trim(),
    checkedAt,
    source,
    observedAt: observed.iso,
    verifiedAt: verified.iso,
    evidence,
    confidence,
  } as const;

  if (freshnessAgeMs <= freshForMs) {
    return finaliseAssessedSnapshot({
      ...base,
      state: "fresh",
      value: candidate.value,
      lastKnownValue: null,
    });
  }
  if (freshnessAgeMs <= unavailableAfterMs) {
    return finaliseAssessedSnapshot({
      ...base,
      state: "stale",
      value: null,
      lastKnownValue: null,
    });
  }
  return unavailable(checkedAt, "expired");
}

/**
 * Return a snapshot for display only when this module assessed and finalised
 * that exact object. Structurally compatible objects and spread copies are
 * deliberately rejected because they have not crossed the runtime boundary.
 */
export function assessedSnapshotForDisplay<T>(
  snapshot: VerifiedSnapshot<T>,
): VerifiedSnapshot<T> | null {
  return isAssessedSnapshot(snapshot) ? snapshot : null;
}

/**
 * Return verification metadata only when it independently satisfies the
 * contract's deterministic timestamp and checkedAt ordering rules.
 */
export function verifiedTimestampForDisplay(
  snapshot: VerifiedSnapshot<unknown>,
): string | null {
  if (!isAssessedSnapshot(snapshot)) return null;
  if (snapshot.contractVersion !== VERIFIED_SNAPSHOT_CONTRACT_VERSION)
    return null;
  if (snapshot.state === "unavailable" || !snapshot.source) return null;
  const checked = parseTimestamp(snapshot.checkedAt);
  const observed = parseTimestamp(snapshot.observedAt);
  const verified = parseTimestamp(snapshot.verifiedAt);
  if (
    !checked ||
    !observed ||
    !verified ||
    verified.ms > checked.ms ||
    observed.ms > verified.ms
  ) {
    return null;
  }
  return verified.iso;
}

/** The only supported current-value accessor: stale/unavailable always null. */
export function currentSnapshotValue<T>(
  snapshot: VerifiedSnapshot<T>,
): T | null {
  return isAssessedSnapshot(snapshot) && snapshot.state === "fresh"
    ? snapshot.value
    : null;
}
