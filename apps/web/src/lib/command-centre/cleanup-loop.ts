// src/lib/command-centre/cleanup-loop.ts
//
// UNI-2150 — Mission Control cleanup loop.
//
// Closes the loop on scoped execution batches: detects when a SCOPED Linear
// project / task batch is complete and builds a proposed final summary while
// refusing to close broad roadmap projects,
// surfacing open blockers that prevent closure, and grouping stale duplicates.
//
// SAFETY: assessment-only. There is no mutation dependency, live option, or
// environment gate that can turn this module into a Linear writer.

export type ScopeKind = "scoped" | "roadmap";
export type IssueClass = "terminal" | "open" | "blocked";

const BLOCKED_LABEL_PREFIX = "pi-dev:blocked-reason:";

/** Normalised issue the cleanup logic operates on. */
export interface CleanupIssue {
  id: string;
  identifier: string;
  title: string;
  /** Linear state type. */
  stateType:
    "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";
  labels: string[];
  blockedByOpenCount: number;
  updatedAt: string;
}

export interface CleanupBatch {
  scopeId: string;
  scopeName: string;
  scopeKind: ScopeKind;
  issues: CleanupIssue[];
  /** Already closed? Makes a rerun an idempotent no-op. */
  alreadyClosed?: boolean;
  /** Issue ids explicitly accepted as exclusions (a known blocker we'll close around). */
  acceptedExclusions?: string[];
}

export type CleanupState =
  | "complete" // every issue terminal → closeable
  | "closeable_with_exclusions" // remaining non-terminal are all accepted exclusions
  | "open" // unfinished non-blocked work remains → not closeable
  | "blocked" // open blockers remain (not accepted) → not closeable
  | "already_closed" // idempotent no-op
  | "not_scoped"; // a roadmap project — never auto-closed

export interface DuplicateGroup {
  key: string;
  identifiers: string[];
}

export interface CleanupAssessment {
  scopeId: string;
  scopeName: string;
  state: CleanupState;
  closeable: boolean;
  counts: {
    total: number;
    terminal: number;
    open: number;
    blocked: number;
    accepted: number;
  };
  blockers: { identifier: string; reason: string }[];
  duplicates: DuplicateGroup[];
}

export function classifyIssue(issue: CleanupIssue): IssueClass {
  if (issue.stateType === "completed" || issue.stateType === "canceled")
    return "terminal";
  if (
    issue.blockedByOpenCount > 0 ||
    issue.labels.some((l) => l.toLowerCase().startsWith(BLOCKED_LABEL_PREFIX))
  ) {
    return "blocked";
  }
  return "open";
}

function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/** Group non-terminal issues that share a normalised title (stale duplicates). */
export function findDuplicateGroups(issues: CleanupIssue[]): DuplicateGroup[] {
  const byKey = new Map<string, string[]>();
  for (const issue of issues) {
    if (classifyIssue(issue) === "terminal") continue;
    const key = normaliseTitle(issue.title);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(issue.identifier);
    byKey.set(key, list);
  }
  return [...byKey.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, identifiers]) => ({ key, identifiers }));
}

export function assessBatch(batch: CleanupBatch): CleanupAssessment {
  const accepted = new Set(batch.acceptedExclusions ?? []);
  const base = {
    scopeId: batch.scopeId,
    scopeName: batch.scopeName,
    duplicates: findDuplicateGroups(batch.issues),
  };

  if (batch.scopeKind === "roadmap") {
    return {
      ...base,
      state: "not_scoped",
      closeable: false,
      counts: tally(batch, accepted),
      blockers: [],
    };
  }
  if (batch.alreadyClosed) {
    return {
      ...base,
      state: "already_closed",
      closeable: false,
      counts: tally(batch, accepted),
      blockers: [],
    };
  }

  const counts = tally(batch, accepted);
  const blockers = batch.issues
    .filter((i) => classifyIssue(i) === "blocked" && !accepted.has(i.id))
    .map((i) => ({
      identifier: i.identifier,
      reason:
        i.labels.find((l) =>
          l.toLowerCase().startsWith(BLOCKED_LABEL_PREFIX),
        ) ?? "blocked by open dependency",
    }));

  // Non-terminal issues that are NOT accepted exclusions.
  const unresolved = batch.issues.filter(
    (i) => classifyIssue(i) !== "terminal" && !accepted.has(i.id),
  );

  let state: CleanupState;
  if (unresolved.length === 0) {
    state =
      counts.accepted > 0 && counts.terminal < counts.total
        ? "closeable_with_exclusions"
        : "complete";
  } else if (blockers.length > 0) {
    state = "blocked";
  } else {
    state = "open";
  }

  return {
    ...base,
    state,
    closeable: state === "complete" || state === "closeable_with_exclusions",
    counts,
    blockers,
  };
}

function tally(batch: CleanupBatch, accepted: Set<string>) {
  let terminal = 0;
  let open = 0;
  let blocked = 0;
  for (const i of batch.issues) {
    const c = classifyIssue(i);
    if (c === "terminal") terminal++;
    else if (c === "blocked") blocked++;
    else open++;
  }
  return {
    total: batch.issues.length,
    terminal,
    open,
    blocked,
    accepted: accepted.size,
  };
}

// ─── Closure summary ─────────────────────────────────────────────────────────

export interface CleanupSummaryInput {
  runner: string;
  at: string;
}

/** Final summary posted when a scoped batch is closed. No secrets. */
export function buildCleanupSummary(
  assessment: CleanupAssessment,
  batch: CleanupBatch,
  input: CleanupSummaryInput,
): string {
  const done = batch.issues
    .filter((i) => classifyIssue(i) === "terminal")
    .map((i) => i.identifier);
  const idToIdent = new Map(batch.issues.map((i) => [i.id, i.identifier]));
  const excluded = (batch.acceptedExclusions ?? []).map(
    (id) => idToIdent.get(id) ?? id,
  );
  const lines = [
    `🧹 **Cleanup — ${batch.scopeName}** (${input.runner})`,
    "",
    `- Closed at: ${input.at}`,
    `- Completed: ${done.length}/${assessment.counts.total} (${done.join(", ") || "none"})`,
  ];
  if (excluded.length)
    lines.push(`- Accepted exclusions: ${excluded.join(", ")}`);
  if (assessment.blockers.length)
    lines.push(
      `- Open blockers (kept open): ${assessment.blockers.map((b) => b.identifier).join(", ")}`,
    );
  if (assessment.duplicates.length) {
    lines.push(
      `- Duplicate clusters flagged for review: ${assessment.duplicates.map((d) => d.identifiers.join("/")).join("; ")}`,
    );
  }
  lines.push(
    "",
    "Next: review the flagged duplicates; broad roadmap projects are left untouched.",
  );
  return lines.join("\n");
}

// ─── Assessment result (permanently non-mutating) ───────────────────────────

export interface CleanupOptions {
  runner?: string;
  now?: () => string;
}

export interface CleanupResult {
  ran_at: string;
  mode: "assessment-only";
  state: CleanupState;
  closed: boolean;
  summary: string | null;
  assessment: CleanupAssessment;
}

export async function runCleanup(
  batch: CleanupBatch,
  opts: CleanupOptions = {},
): Promise<CleanupResult> {
  const now = opts.now ?? (() => new Date().toISOString());
  const ranAt = now();
  const runner = opts.runner ?? "crm-ownest-assessment";

  const assessment = assessBatch(batch);

  if (!assessment.closeable) {
    return {
      ran_at: ranAt,
      mode: "assessment-only",
      state: assessment.state,
      closed: false,
      summary: null,
      assessment,
    };
  }

  const summary = buildCleanupSummary(assessment, batch, { runner, at: ranAt });

  return {
    ran_at: ranAt,
    mode: "assessment-only",
    state: assessment.state,
    closed: false,
    summary,
    assessment,
  };
}
