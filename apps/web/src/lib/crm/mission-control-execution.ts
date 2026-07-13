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

/** Status values a CRM job may hold once execution runs. All are poller-inert
 *  (outside the autopilot poller's (planned, queued) claim set); 'running' and the
 *  terminals keep the blocked→running→done|failed lifecycle canTransition-legal. */
export type CrmOperatorOutcomeStatus = 'running' | 'done' | 'failed' | typeof CRM_OPERATOR_JOB_STATUS;

/** The mutable slice of a CRM job row written when a synchronous execution completes. */
export interface CrmOperatorJobOutcomeUpdate {
  status: CrmOperatorOutcomeStatus;
  metadata: Record<string, unknown>;
}

/** An operator_event recording a CRM execution transition (or a no-transition note). */
export interface CrmOperatorOutcomeEventInsert {
  founder_id: string;
  job_id: string;
  event_type: 'status_changed' | 'note';
  from_status: OperatorJobStatus | null;
  to_status: OperatorJobStatus | null;
  detail: string;
  evidence_ref: null;
}

/** The synchronous execution result this module maps onto the job row. Structurally
 *  a superset-compatible view of crm-auto-executor's CrmExecutionResult. */
export interface CrmExecutionOutcome {
  state: 'executed' | 'failed' | 'needs_review';
  reason: string;
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
    update(payload: CrmOperatorJobOutcomeUpdate): {
      eq(column: string, value: string): {
        eq(column: string, value: string): Promise<{ data: unknown; error: { message?: string } | null }>;
      };
    };
  };
  from(table: 'operator_events'): {
    insert(
      payload: CrmOperatorEventInsert | CrmOperatorOutcomeEventInsert,
    ): Promise<{ data: unknown; error: { message?: string } | null }>;
  };
}

interface CrmOperatorJobsSelectBuilder {
  eq(column: string, value: string): CrmOperatorJobsSelectBuilder;
  limit(count: number): Promise<{ data: Array<{ id: string }> | null; error: { message?: string } | null }>;
}

/** The subject/admission fields common to a CRM job's metadata across its lifecycle.
 *  Shared by the initial insert and the execution-outcome update so the two can
 *  never drift; the caller layers `missionControlState` (+ `executionReason`) on top. */
function crmJobBaseMetadata(
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
): Record<string, unknown> {
  return {
    approvalId: evaluation.id,
    subjectType: evaluation.subjectType,
    lifecycleDecision: evaluation.decision,
    admitted: decision.admitted,
    reason: decision.reason,
  };
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
      ...crmJobBaseMetadata(evaluation, decision),
      missionControlState: decision.state,
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

// ── execution-outcome wiring (go-live: synchronous executor → job row) ───────
//
// When (and only when) the Board arming flip is on and an approval is admitted,
// the CRM route runs the mutation synchronously (crm-auto-executor) and hands the
// result here. This closes the loop: the operator_jobs row — persisted at
// admission time as status:'blocked' (poller-inert) — is transitioned to reflect
// what actually happened, so the Mission Control reader shows the true outcome
// instead of a stale admission state.
//
// Lifecycle is the operator-gateway's own idiom: blocked → running → done|failed,
// one 'status_changed' event per hop. Every transition is canTransition-legal and
// every status stays OUTSIDE the poller's (planned, queued) claim set, so the
// poller-inert safety invariant holds throughout a real execution. A 'needs_review'
// outcome (admitted but no executor implemented, e.g. an armed L2/L3) performs no
// status transition — the row stays blocked awaiting founder review, recorded as a
// 'note'. Authoritative: any write failure throws, never a silent false-green after
// a mutation has run.

interface CrmOutcomeMapping {
  terminalStatus: CrmOperatorOutcomeStatus;
  missionControlState: CrmMissionControlState;
}

const CRM_EXECUTION_OUTCOME: Record<CrmExecutionOutcome['state'], CrmOutcomeMapping> = {
  executed: { terminalStatus: 'done', missionControlState: 'executed' },
  failed: { terminalStatus: 'failed', missionControlState: 'failed' },
  needs_review: { terminalStatus: CRM_OPERATOR_JOB_STATUS, missionControlState: 'needs_review' },
};

function crmOutcomeMetadata(
  evaluation: CrmApprovalLifecycleEvaluation,
  decision: CrmAdmissionDecision,
  missionControlState: CrmMissionControlState,
  executionReason: string,
): Record<string, unknown> {
  return {
    ...crmJobBaseMetadata(evaluation, decision),
    missionControlState,
    executionReason,
  };
}

export interface ApplyCrmExecutionOutcomeOptions {
  client: CrmOperatorJobsWriteClient;
  founderId: string;
  jobId: string;
  evaluation: CrmApprovalLifecycleEvaluation;
  decision: CrmAdmissionDecision;
  execution: CrmExecutionOutcome;
}

async function writeCrmJobStatus(
  client: CrmOperatorJobsWriteClient,
  founderId: string,
  jobId: string,
  update: CrmOperatorJobOutcomeUpdate,
): Promise<void> {
  const result = await client
    .from('operator_jobs')
    .update(update)
    .eq('id', jobId)
    .eq('founder_id', founderId);
  if (result.error) {
    throw new Error(`CRM operator_jobs outcome update failed: ${result.error.message ?? 'unknown error'}`);
  }
}

async function writeCrmOutcomeEvent(
  client: CrmOperatorJobsWriteClient,
  event: CrmOperatorOutcomeEventInsert,
): Promise<void> {
  const result = await client.from('operator_events').insert(event);
  if (result.error) {
    throw new Error(`CRM operator_events outcome event insert failed: ${result.error.message ?? 'unknown error'}`);
  }
}

/**
 * Reflect a synchronous CRM execution outcome onto its operator_jobs row. Runs the
 * blocked → running → done|failed lifecycle (or a no-transition needs_review note),
 * founder-scoped and authoritative (throws on any write failure). See the block
 * comment above for the poller-inert safety invariant this upholds.
 */
export async function applyCrmExecutionOutcome(options: ApplyCrmExecutionOutcomeOptions): Promise<void> {
  const { client, founderId, jobId, evaluation, decision, execution } = options;
  const mapping = CRM_EXECUTION_OUTCOME[execution.state];

  if (execution.state === 'needs_review') {
    // Admitted but nothing ran — no status transition; hold blocked for founder review.
    await writeCrmJobStatus(client, founderId, jobId, {
      status: CRM_OPERATOR_JOB_STATUS,
      metadata: crmOutcomeMetadata(evaluation, decision, 'needs_review', execution.reason),
    });
    await writeCrmOutcomeEvent(client, {
      founder_id: founderId,
      job_id: jobId,
      event_type: 'note',
      from_status: CRM_OPERATOR_JOB_STATUS,
      to_status: CRM_OPERATOR_JOB_STATUS,
      detail: `CRM approval execution → needs_review (${execution.reason})`,
      evidence_ref: null,
    });
    return;
  }

  // blocked → running (executing)
  await writeCrmJobStatus(client, founderId, jobId, {
    status: 'running',
    metadata: crmOutcomeMetadata(evaluation, decision, 'executing', execution.reason),
  });
  await writeCrmOutcomeEvent(client, {
    founder_id: founderId,
    job_id: jobId,
    event_type: 'status_changed',
    from_status: CRM_OPERATOR_JOB_STATUS,
    to_status: 'running',
    detail: `CRM approval ${evaluation.id} executing`,
    evidence_ref: null,
  });

  // running → done | failed
  await writeCrmJobStatus(client, founderId, jobId, {
    status: mapping.terminalStatus,
    metadata: crmOutcomeMetadata(evaluation, decision, mapping.missionControlState, execution.reason),
  });
  await writeCrmOutcomeEvent(client, {
    founder_id: founderId,
    job_id: jobId,
    event_type: 'status_changed',
    from_status: 'running',
    to_status: mapping.terminalStatus,
    detail: `CRM approval ${evaluation.id} execution → ${mapping.missionControlState} (${execution.reason})`,
    evidence_ref: null,
  });
}
