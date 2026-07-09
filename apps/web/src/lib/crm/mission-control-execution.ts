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

// ── operator_jobs persistence (go-live step 2) ──────────────────────────────
//
// Every processed CRM approval is recorded as one founder-scoped operator_jobs
// row + a 'created' operator_event, reusing the operator-gateway tables (not a
// new harness). Pattern mirrors src/lib/command-centre/lanes/wiki-enhance.ts:
// founder session client, authoritative writes (throw on failure — the row IS
// the state-of-record), dedup on the approval id.
//
// SAFETY — poller decoupling: the Mac-side autopilot-runner poller
// (apps/autopilot-runner) claims operator_jobs whose status is in
// (planned, queued), with no task_type pre-filter. CRM execution is the CRM
// route's own synchronous, Board-gated concern — it must NEVER be claimed by
// that shared poller. So a CRM record is always persisted status:'blocked'
// (poller-inert); the founder-facing Mission Control state ('queued' /
// 'needs_review' / …) lives in metadata.missionControlState. This holds even
// once CRM_AUTO_EXECUTE is armed and admission becomes reachable.

/** operator_jobs.lane_id for CRM Mission Control records (free-text lane; not an OPERATOR_LANES model lane). */
export const CRM_MISSION_CONTROL_LANE_ID = 'crm_mission_control';

/** Poller-inert status for every CRM record. See the SAFETY note above. */
const CRM_OPERATOR_JOB_STATUS = 'blocked' as const;

export interface CrmOperatorJobInsert {
  founder_id: string;
  lane_id: string;
  title: string;
  task_type: string;
  status: typeof CRM_OPERATOR_JOB_STATUS;
  external_action_requested: false;
  production_action_requested: false;
  api_key_requested: false;
  evidence_refs: string[];
  metadata: Record<string, unknown>;
}

export interface CrmOperatorEventInsert {
  founder_id: string;
  job_id: string;
  event_type: 'created';
  from_status: null;
  to_status: typeof CRM_OPERATOR_JOB_STATUS;
  detail: string;
  evidence_ref: null;
}

/** Minimal structural view of the founder Supabase client used by the CRM persistence path. */
export interface CrmOperatorJobsWriteClient {
  from(table: 'operator_jobs'): {
    select(columns: string): CrmOperatorJobsSelectBuilder;
    insert(payload: CrmOperatorJobInsert): {
      select(columns: string): {
        single(): Promise<{ data: { id: string } | null; error: { message?: string } | null }>;
      };
    };
  };
  from(table: 'operator_events'): {
    insert(payload: CrmOperatorEventInsert): Promise<{ data: unknown; error: { message?: string } | null }>;
  };
}

interface CrmOperatorJobsSelectBuilder {
  eq(column: string, value: string): CrmOperatorJobsSelectBuilder;
  limit(count: number): Promise<{ data: Array<{ id: string }> | null; error: { message?: string } | null }>;
}

export function buildCrmOperatorJobInsert(
  founderId: string,
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
): CrmOperatorJobInsert {
  return {
    founder_id: founderId,
    lane_id: CRM_MISSION_CONTROL_LANE_ID,
    title: `CRM approval ${evaluation.id}`,
    task_type: evaluation.subjectType,
    status: CRM_OPERATOR_JOB_STATUS,
    external_action_requested: false,
    production_action_requested: false,
    api_key_requested: false,
    evidence_refs: [],
    metadata: {
      approvalId: evaluation.id,
      subjectType: evaluation.subjectType,
      lifecycleDecision: evaluation.decision,
      admitted: decision.admitted,
      missionControlState: decision.state,
      reason: decision.reason,
    },
  };
}

export function buildCrmOperatorEventInsert(
  founderId: string,
  jobId: string,
  decision: CrmAdmissionDecision,
): CrmOperatorEventInsert {
  return {
    founder_id: founderId,
    job_id: jobId,
    event_type: 'created',
    from_status: null,
    to_status: CRM_OPERATOR_JOB_STATUS,
    detail: `CRM approval admission → ${decision.state} (${decision.reason})`,
    evidence_ref: null,
  };
}

export interface PersistCrmMissionControlJobOptions {
  client: CrmOperatorJobsWriteClient;
  founderId: string;
  evaluation: CrmApprovalLifecycleEvaluation;
  decision: CrmAdmissionDecision;
}

export type PersistCrmMissionControlJobResult = { jobId: string; deduped: boolean };

/**
 * Persist (or re-resolve) the operator_jobs record for a processed CRM approval.
 * Authoritative: throws on any DB failure so a broken write can never surface as
 * a green 200. Dedups on the approval id (a re-processed approval returns the
 * existing record). No CRM mutation and no dispatch occur here.
 */
export async function persistCrmMissionControlJob(
  options: PersistCrmMissionControlJobOptions,
): Promise<PersistCrmMissionControlJobResult> {
  const { client, founderId, evaluation, decision } = options;

  const existing = await client
    .from('operator_jobs')
    .select('id')
    .eq('founder_id', founderId)
    .eq('lane_id', CRM_MISSION_CONTROL_LANE_ID)
    .eq('metadata->>approvalId', evaluation.id)
    .limit(1);
  if (existing.error) {
    throw new Error(`CRM operator_jobs dedup lookup failed: ${existing.error.message ?? 'unknown error'}`);
  }
  if (existing.data && existing.data.length > 0) {
    return { jobId: existing.data[0].id, deduped: true };
  }

  const jobResult = await client
    .from('operator_jobs')
    .insert(buildCrmOperatorJobInsert(founderId, evaluation, decision))
    .select('id')
    .single();
  if (jobResult.error || !jobResult.data) {
    throw new Error(`CRM operator_jobs insert failed: ${jobResult.error?.message ?? 'no row returned'}`);
  }

  const jobId = jobResult.data.id;
  const eventResult = await client
    .from('operator_events')
    .insert(buildCrmOperatorEventInsert(founderId, jobId, decision));
  if (eventResult.error) {
    throw new Error(`CRM operator_events insert failed: ${eventResult.error.message ?? 'unknown error'}`);
  }

  return { jobId, deduped: false };
}
