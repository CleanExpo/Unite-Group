// UNI-2234 — CRM Mission Control consumer core (slice 1 of the system-of-action).
//
// The single admission chokepoint that turns a CRM approval lifecycle evaluation
// into a Mission Control state. This slice is a DORMANT foundation: it decides
// admission and target state, but `dispatchEnabled` is always false — no CRM
// mutation is ever run here. Live dispatch (productionActionRequested) is a
// separate Board gate + founder go-live; see
// docs/superpowers/specs/2026-07-09-crm-mission-control-system-of-action-design.md.
//
// Admission is exactly `evaluation.safeToAutoExecute`, which the decision-gate in
// approval-lifecycle.ts can only set true when the lifecycle decision is
// 'may_execute', the risk matrix says safe, AND the `CRM_AUTO_EXECUTE` kill switch
// is on. With the kill switch unset (prod default) admission is always false, so
// every approval routes to needs-review — behaviour-neutral.

import type { CrmApprovalLifecycleEvaluation } from './approval-lifecycle';
import type { OperatorJobStatus } from '@/lib/operator-gateway/jobs';
import type { EvidenceLedgerInsert } from '@/lib/obsidian/evidence';

/** Founder-facing Mission Control states. `executing`/`executed`/`failed` are
 *  reached only once the Board-gated worker (a later slice) dispatches. */
export type CrmMissionControlState =
  | 'queued'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'needs_review';

export interface CrmAdmissionDecision {
  /** True only when the approval is safe to auto-execute (kill switch on + matrix-safe + may_execute). */
  admitted: boolean;
  /** Mission Control state for this admission step. */
  state: CrmMissionControlState;
  /** Corresponding operator_jobs status (reuses the operator-gateway state machine). */
  operatorStatus: Extract<OperatorJobStatus, 'queued' | 'blocked'>;
  /** Machine-readable reason, passed through from the lifecycle/matrix evaluation. */
  reason: string;
  /** Always false in this slice — live dispatch is a separate Board gate. */
  dispatchEnabled: false;
}

/**
 * Resolve a CRM approval lifecycle evaluation into a Mission Control admission
 * decision. Admitted approvals are queued for the (Board-gated, dispatch-disabled)
 * worker; everything else goes to needs-review with its reason preserved.
 */
export function resolveCrmAdmission(evaluation: CrmApprovalLifecycleEvaluation): CrmAdmissionDecision {
  if (evaluation.safeToAutoExecute) {
    return {
      admitted: true,
      state: 'queued',
      operatorStatus: 'queued',
      reason: evaluation.autoExecuteReason,
      dispatchEnabled: false,
    };
  }
  return {
    admitted: false,
    state: 'needs_review',
    operatorStatus: 'blocked',
    reason: evaluation.autoExecuteReason,
    dispatchEnabled: false,
  };
}

/**
 * Build the evidence-ledger row recording an admission decision (write-then-confirm:
 * the caller journals this after the operator_job/event is committed). Non-mutating
 * audit data — never a CRM state change.
 */
export function buildCrmAdmissionEvidenceRow(
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
): EvidenceLedgerInsert {
  return {
    kind: 'crm_approval_admission',
    summary: `CRM approval ${evaluation.id} → ${decision.state} (${decision.reason})`,
    detail: {
      approvalId: evaluation.id,
      subjectType: evaluation.subjectType,
      lifecycleDecision: evaluation.decision,
      admitted: decision.admitted,
      state: decision.state,
      operatorStatus: decision.operatorStatus,
      reason: decision.reason,
      dispatchEnabled: decision.dispatchEnabled,
    },
    evidence_path: null,
  };
}
