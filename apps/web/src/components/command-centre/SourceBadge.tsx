// SourceBadge — universal data-source metadata pip for Command Center panels.
//
// Tells the operator whether a value is fresh from a system of record, a
// static seed, mid-fetch, or a stale fallback. Single rendering primitive
// every panel embeds — a SourceMode union keeps panels from inventing rogue
// values, so seed numbers can never be silently dressed as live.
//
//   - 'live'      — values come from an API request that succeeded this session.
//   - 'seed'      — values come from a hand-curated TS seed in this repo.
//   - 'loading'   — request in flight; no value to trust yet.
//   - 'degraded'  — request attempted, fetch failed; rendering a fallback seed.
//
// Verified snapshot badges add fresh/stale/unavailable. Those states cannot be
// selected through legacy props; they are derived only from a snapshot that
// crossed the runtime assessment boundary.

import {
  assessedSnapshotForDisplay,
  verifiedTimestampForDisplay,
  type SnapshotState,
  type SnapshotUnavailableReason,
  type VerifiedSnapshot,
} from "@/lib/command-centre/verified-snapshot";

/** Legacy source classification retained for all existing callers. */
export type SourceMode = "live" | "seed" | "loading" | "degraded";

/** Verified states are derived exclusively from a VerifiedSnapshot. */
export type VerifiedSourceMode = SnapshotState;

type RenderedSourceMode = SourceMode | VerifiedSourceMode;

interface LegacySourceBadgeProps {
  /** Classification of the underlying data. */
  mode: SourceMode;
  /** Short human label, e.g. "CC · 7 tasks" or "seed v1". */
  label: string;
  /** ISO timestamp of the last data refresh. Only rendered for 'live'. */
  lastUpdatedAt?: string;
  snapshot?: never;
}

interface VerifiedSourceBadgeProps {
  /**
   * The snapshot is the sole source of state, identity, and timestamps.
   * Legacy fields are forbidden so a badge cannot contradict the contract.
   */
  snapshot: VerifiedSnapshot<unknown>;
  mode?: never;
  label?: never;
  lastUpdatedAt?: never;
}

export type SourceBadgeProps =
  LegacySourceBadgeProps | VerifiedSourceBadgeProps;

const LEGACY_SOURCE_MODES = new Set<SourceMode>([
  "live",
  "seed",
  "loading",
  "degraded",
]);

const MODE_LABEL: Record<RenderedSourceMode, string> = {
  live: "live",
  seed: "seed",
  loading: "loading",
  degraded: "degraded",
  fresh: "fresh",
  stale: "stale",
  unavailable: "unavailable",
};

// 'degraded' is a warning, not an alert — amber family (matches the deck's
// own --deck-amber tokens), not the cc-signal green/red. Dot uses the bright
// fill; text uses the AA-passing darkened variant.
function dotColorFor(mode: RenderedSourceMode): string {
  if (mode === "live") return "var(--cc-ink, #cfe0ec)";
  if (mode === "fresh") return "var(--cc-signal, #2dbb57)";
  if (mode === "degraded" || mode === "stale")
    return "var(--deck-amber, #f4820f)";
  if (mode === "unavailable") return "var(--deck-abort, #e5484d)";
  return "var(--cc-ink-hush, rgba(207,224,236,0.45))";
}

function textColorFor(mode: RenderedSourceMode): string {
  if (mode === "live") return "var(--cc-ink, #cfe0ec)";
  if (mode === "fresh") return "var(--cc-signal-text, #34d399)";
  if (mode === "degraded" || mode === "stale")
    return "var(--deck-amber-text, #b45309)";
  if (mode === "unavailable") return "var(--deck-abort-text, #b91c1c)";
  return "var(--cc-ink-hush, rgba(207,224,236,0.45))";
}

function formatTimestamp(iso: string): string | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  const now = Date.now();
  const deltaSec = Math.max(0, Math.round((now - parsed) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  if (deltaSec < 3600) return `${Math.round(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.round(deltaSec / 3600)}h ago`;
  return `${Math.round(deltaSec / 86400)}d ago`;
}

function humaniseReason(reason: SnapshotUnavailableReason): string {
  return reason.replaceAll("_", " ");
}

function verifiedAccessibleDetail(
  snapshot: VerifiedSnapshot<unknown>,
  verifiedAt: string | null,
): string {
  const snapshotIdentity = snapshot.snapshotVersion
    ? `Snapshot ${snapshot.snapshotVersion}.`
    : "Snapshot identity unavailable.";
  const verification = verifiedAt
    ? `Verified at ${verifiedAt}.`
    : "Never verified.";
  const observation = snapshot.observedAt
    ? `Observed at ${snapshot.observedAt}.`
    : "No observation recorded.";
  const evidence = snapshot.evidence
    ? `Evidence ${snapshot.evidence.reference}. Provenance ${snapshot.evidence.provenance}.`
    : "Evidence unavailable.";
  const confidence = snapshot.confidence
    ? `Confidence ${snapshot.confidence.level}. Basis ${snapshot.confidence.basis}.`
    : "Confidence unavailable.";
  const unavailableReason =
    snapshot.state === "unavailable"
      ? `Reason ${humaniseReason(snapshot.reason)}.${snapshot.detail ? ` Detail ${snapshot.detail}.` : ""}`
      : "";

  return `Contract ${snapshot.contractVersion}. ${snapshotIdentity} ${observation} ${verification} ${evidence} ${confidence} ${unavailableReason}`.trim();
}

function hasVerifiedSnapshot(
  props: SourceBadgeProps,
): props is VerifiedSourceBadgeProps {
  return props.snapshot !== undefined;
}

function isLegacySourceMode(mode: unknown): mode is SourceMode {
  return (
    typeof mode === "string" && LEGACY_SOURCE_MODES.has(mode as SourceMode)
  );
}

export function SourceBadge(props: SourceBadgeProps) {
  const isVerified = hasVerifiedSnapshot(props);
  const snapshot = isVerified
    ? assessedSnapshotForDisplay(props.snapshot)
    : null;
  const rejectedSnapshot = isVerified && snapshot === null;
  const legacyMode =
    !isVerified && isLegacySourceMode(props.mode) ? props.mode : null;
  const rejectedLegacyMode = !isVerified && legacyMode === null;
  const mode: RenderedSourceMode = isVerified
    ? (snapshot?.state ?? "unavailable")
    : (legacyMode ?? "unavailable");
  const label = isVerified
    ? (snapshot?.source?.label ?? "source unavailable")
    : rejectedLegacyMode
      ? "source unavailable"
      : props.label;
  const dotColor = dotColorFor(mode);
  const textColor = textColorFor(mode);
  const stamp =
    legacyMode === "live" && props.lastUpdatedAt
      ? formatTimestamp(props.lastUpdatedAt)
      : null;
  const verifiedAt = snapshot ? verifiedTimestampForDisplay(snapshot) : null;
  const accessibleDetail = snapshot
    ? verifiedAccessibleDetail(snapshot, verifiedAt)
    : rejectedSnapshot
      ? "Snapshot assessment unavailable. Source, timing, evidence, provenance, confidence, and value are not trusted."
      : rejectedLegacyMode
        ? "Source mode unavailable. Source, timing, and value are not trusted."
        : null;

  return (
    <span
      data-source-mode={mode}
      data-source-state={isVerified || rejectedLegacyMode ? mode : undefined}
      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ color: "var(--cc-ink-hush, rgba(207,224,236,0.45))" }}
      role="status"
      aria-atomic="true"
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
        }}
      />
      <span style={{ color: textColor }}>{MODE_LABEL[mode]}</span>
      <span>·</span>
      <span style={{ color: "var(--cc-ink-dim, #6f879b)" }}>{label}</span>
      {stamp && (
        <>
          <span>·</span>
          <span style={{ color: "var(--cc-ink-hush, rgba(207,224,236,0.45))" }}>
            {stamp}
          </span>
        </>
      )}
      {snapshot && (
        <>
          <span>·</span>
          <span data-testid="source-checked-at">
            checked{" "}
            <time dateTime={snapshot.checkedAt}>{snapshot.checkedAt}</time>
          </span>
          <span>·</span>
          {verifiedAt ? (
            <span data-testid="source-verified-at">
              verified <time dateTime={verifiedAt}>{verifiedAt}</time>
            </span>
          ) : (
            <span data-testid="source-never-verified">never verified</span>
          )}
        </>
      )}
      {snapshot?.state === "unavailable" && (
        <>
          <span>·</span>
          <span data-testid="source-unavailable-reason">
            {humaniseReason(snapshot.reason)}
            {snapshot.detail ? `: ${snapshot.detail}` : ""}
          </span>
        </>
      )}
      {rejectedSnapshot && (
        <>
          <span>·</span>
          <span data-testid="source-unassessed">snapshot unassessed</span>
        </>
      )}
      {rejectedLegacyMode && (
        <>
          <span>·</span>
          <span data-testid="source-mode-rejected">source mode rejected</span>
        </>
      )}
      {accessibleDetail && (
        <span className="sr-only" data-testid="source-accessible-detail">
          {accessibleDetail}
        </span>
      )}
    </span>
  );
}
