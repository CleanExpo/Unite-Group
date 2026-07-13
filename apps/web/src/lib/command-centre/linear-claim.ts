// Pure inventory predicates retained for classifying legacy autonomous-labelled
// Linear projections. The claim, receipt, execution-packet, state-update, and
// comment orchestration was permanently removed when CRM OWNEST became the
// authority. This module cannot perform I/O.

export type LinearStateType =
  "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";

/** Historical labels used only to inventory projections created by old lanes. */
export const AUTONOMOUS_LABELS = ["mesh:auto", "pi-dev:autonomous"] as const;

export const BLOCKED_LABEL_PREFIX = "pi-dev:blocked-reason:";

const ACCEPTANCE_HEADING = /(^|\n)\s*#{0,6}\s*acceptance criteria/i;

export interface ClaimCandidate {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  description: string | null;
  createdAt: string;
  url?: string;
  stateName: string;
  stateType: LinearStateType;
  labels: string[];
  blockedByOpenCount: number;
}

export type SkipReason =
  "not-autonomous" | "ineligible-state" | "blocked" | "no-acceptance-criteria";

export interface Eligibility {
  claimable: boolean;
  reason: SkipReason | "eligible";
}

export function hasAutonomousLabel(
  issue: Pick<ClaimCandidate, "labels">,
): boolean {
  const present = new Set(issue.labels.map((label) => label.toLowerCase()));
  return AUTONOMOUS_LABELS.some((label) => present.has(label));
}

export function isEligibleState(
  issue: Pick<ClaimCandidate, "stateType">,
): boolean {
  return issue.stateType === "unstarted" || issue.stateType === "backlog";
}

export function isBlocked(
  issue: Pick<ClaimCandidate, "labels" | "blockedByOpenCount">,
): boolean {
  if (issue.blockedByOpenCount > 0) return true;
  return issue.labels.some((label) =>
    label.toLowerCase().startsWith(BLOCKED_LABEL_PREFIX),
  );
}

export function hasAcceptanceCriteria(
  issue: Pick<ClaimCandidate, "description">,
): boolean {
  return Boolean(
    issue.description && ACCEPTANCE_HEADING.test(issue.description),
  );
}

export function evaluateEligibility(issue: ClaimCandidate): Eligibility {
  if (!hasAutonomousLabel(issue))
    return { claimable: false, reason: "not-autonomous" };
  if (!isEligibleState(issue))
    return { claimable: false, reason: "ineligible-state" };
  if (isBlocked(issue)) return { claimable: false, reason: "blocked" };
  if (!hasAcceptanceCriteria(issue))
    return { claimable: false, reason: "no-acceptance-criteria" };
  return { claimable: true, reason: "eligible" };
}

function priorityRank(priority: number): number {
  return priority === 0 ? Number.MAX_SAFE_INTEGER : priority;
}

export interface SelectionResult {
  next: ClaimCandidate | null;
  eligibleCount: number;
  skipped: { identifier: string; reason: SkipReason }[];
}

/**
 * Historical classifier for inventory and migration reporting. `next` means
 * the item the old selector would have chosen; it is never an execution offer.
 */
export function selectNextClaimable(issues: ClaimCandidate[]): SelectionResult {
  const eligible: ClaimCandidate[] = [];
  const skipped: { identifier: string; reason: SkipReason }[] = [];

  for (const issue of issues) {
    const verdict = evaluateEligibility(issue);
    if (verdict.claimable) eligible.push(issue);
    else
      skipped.push({
        identifier: issue.identifier,
        reason: verdict.reason as SkipReason,
      });
  }

  eligible.sort((left, right) => {
    const byPriority =
      priorityRank(left.priority) - priorityRank(right.priority);
    if (byPriority !== 0) return byPriority;
    return left.createdAt.localeCompare(right.createdAt);
  });

  return { next: eligible[0] ?? null, eligibleCount: eligible.length, skipped };
}
