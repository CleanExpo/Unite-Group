// Ported from Authority-Site src/lib/crm/approval-lifecycle.ts, 12/06/2026.
// Pure helper — no schema/API assumptions. UNI-2234 added one internal import
// (evaluateAutoExecute, from the sibling auto-exec-matrix module) to compute
// safeToAutoExecute/autoExecuteReason; still no external/DB/network imports.

import { evaluateAutoExecute, type AutoExecuteResult, type AutoExecuteSignals } from './auto-exec-matrix';

export type CrmApprovalSubjectType = 'lead_conversion' | 'opportunity_commitment' | 'client_merge' | 'data_export' | 'other';

export type CrmApprovalKnownStatus = 'requested' | 'approved' | 'rejected' | 'cancelled' | 'executed' | 'expired';
export type CrmApprovalNormalizedStatus = CrmApprovalKnownStatus | 'invalid';
export type CrmApprovalLifecycleSubjectType = CrmApprovalSubjectType | 'invalid';

export type CrmApprovalDecision =
  | 'await_approval'
  | 'may_execute'
  | 'do_not_execute'
  | 'already_executed'
  | 'invalid_request';

export interface CrmApprovalLifecycleInput {
  id: string;
  subjectType: CrmApprovalSubjectType | string;
  requestedBy: string;
  requestedAt: string;
  now: string;
  expiresAt?: string | null;
  status?: CrmApprovalKnownStatus | string | null;
  approvedBy?: string | null;
  approvalReference?: string | null;
  executedAt?: string | null;
  rejectionReason?: string | null;
}

export interface CrmApprovalTaskEvidence {
  id: string;
  status?: string | null;
  priority?: string | null;
  assignee_name?: string | null;
  tags?: string[] | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown> | null;
  now: string;
}

export interface CrmApprovalLifecycleEvaluation {
  id: string;
  subjectType: CrmApprovalLifecycleSubjectType;
  normalizedStatus: CrmApprovalNormalizedStatus;
  decision: CrmApprovalDecision;
  requiresPhillReview: boolean;
  reasons: string[];
  safeToAutoExecute: boolean;
  /** Machine-readable reason from evaluateAutoExecute (auto-exec-matrix.ts) for the safeToAutoExecute value above. */
  autoExecuteReason: string;
}

/**
 * safeToAutoExecute may only ever be true when the lifecycle decision itself is
 * executable ('may_execute'). Every current call site passes no signals (so the
 * matrix already returns safe: false), but the coupling must be structural: a
 * future caller wiring real signals into a rejected/cancelled/expired
 * evaluation must never surface safe: true.
 */
export function evaluateDecisionGatedAutoExecute(
  subjectType: string,
  decision: CrmApprovalDecision,
  signals: AutoExecuteSignals = {},
): AutoExecuteResult {
  const autoExec = evaluateAutoExecute(subjectType, signals);
  if (autoExec.safe && decision !== 'may_execute') {
    return { ...autoExec, safe: false, reason: 'decision_not_executable' };
  }
  return autoExec;
}

const KNOWN_SUBJECT_TYPES: CrmApprovalSubjectType[] = ['lead_conversion', 'opportunity_commitment', 'client_merge', 'data_export', 'other'];
const KNOWN_STATUSES: CrmApprovalKnownStatus[] = ['requested', 'approved', 'rejected', 'cancelled', 'executed', 'expired'];
const HIGH_RISK_SUBJECT_TYPES: CrmApprovalSubjectType[] = ['client_merge', 'data_export'];

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function cleanMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? clean(value) : '';
}

function invalidResult(
  input: CrmApprovalLifecycleInput,
  reasons: string[],
  subjectType: CrmApprovalLifecycleSubjectType = normalizedSubjectType(input.subjectType),
): CrmApprovalLifecycleEvaluation {
  const autoExec = evaluateDecisionGatedAutoExecute(subjectType, 'invalid_request');
  return {
    id: input.id,
    subjectType,
    normalizedStatus: 'invalid',
    decision: 'invalid_request',
    requiresPhillReview: true,
    reasons,
    safeToAutoExecute: autoExec.safe,
    autoExecuteReason: autoExec.reason,
  };
}

function isKnownStatus(status: string): status is CrmApprovalKnownStatus {
  return KNOWN_STATUSES.includes(status as CrmApprovalKnownStatus);
}

function normalizeTaskEvidenceStatus(task: CrmApprovalTaskEvidence): string {
  const metadataStatus = (cleanMetadataString(task.metadata, 'approvalStatus') || cleanMetadataString(task.metadata, 'status')).toLowerCase();
  if (metadataStatus) return metadataStatus;

  if (cleanMetadataString(task.metadata, 'executedAt')) return 'executed';

  const taskStatus = clean(task.status).toLowerCase();
  if (isKnownStatus(taskStatus) && taskStatus !== 'executed') return taskStatus;

  return 'requested';
}

function buildTaskEvidenceRejectionReason(metadata: Record<string, unknown> | null | undefined): string | null {
  return cleanMetadataString(metadata, 'rejectionReason') ? 'Rejection reason recorded in task metadata.' : null;
}

export function buildCrmApprovalLifecycleInputFromTaskEvidence(task: CrmApprovalTaskEvidence): CrmApprovalLifecycleInput {
  const metadata = task.metadata ?? null;
  const status = normalizeTaskEvidenceStatus(task);
  const subjectType = cleanMetadataString(metadata, 'subjectType') || cleanMetadataString(metadata, 'approvalSubjectType') || 'other';

  return {
    id: clean(task.id),
    subjectType,
    requestedBy: 'crm_approval_task',
    requestedAt: clean(task.created_at) || clean(task.updated_at),
    now: clean(task.now),
    expiresAt: cleanMetadataString(metadata, 'expiresAt') || clean(task.due_at) || null,
    status,
    approvedBy: cleanMetadataString(metadata, 'approvedBy') || null,
    approvalReference: cleanMetadataString(metadata, 'approvalReference') || null,
    executedAt: cleanMetadataString(metadata, 'executedAt') || null,
    rejectionReason: status === 'rejected' ? buildTaskEvidenceRejectionReason(metadata) : null,
  };
}

function isKnownSubjectType(subjectType: string): subjectType is CrmApprovalSubjectType {
  return KNOWN_SUBJECT_TYPES.includes(subjectType as CrmApprovalSubjectType);
}

function normalizedSubjectType(subjectType: string): CrmApprovalLifecycleSubjectType {
  const cleanedSubjectType = clean(subjectType);
  return isKnownSubjectType(cleanedSubjectType) ? cleanedSubjectType : 'invalid';
}

function parseTime(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function highRiskReason(subjectType: CrmApprovalSubjectType): string | null {
  if (!HIGH_RISK_SUBJECT_TYPES.includes(subjectType)) return null;
  return `${subjectType} is high-risk and needs explicit Board/Phill review before execution.`;
}

export function evaluateCrmApprovalLifecycle(input: CrmApprovalLifecycleInput): CrmApprovalLifecycleEvaluation {
  const outputSubjectType = normalizedSubjectType(input.subjectType);
  const missingRequired = [
    clean(input.id) ? null : 'id',
    clean(input.requestedBy) ? null : 'requestedBy',
    clean(input.requestedAt) ? null : 'requestedAt',
    clean(input.now) ? null : 'now',
  ].filter(Boolean) as string[];

  if (missingRequired.length > 0) {
    return invalidResult(input, [`Missing required approval lifecycle field(s): ${missingRequired.join(', ')}.`], outputSubjectType);
  }

  if (outputSubjectType === 'invalid') {
    return invalidResult(input, ['Unknown approval subjectType supplied.'], 'invalid');
  }

  const rawStatus = (clean(input.status) || 'requested').toLowerCase();
  if (!isKnownStatus(rawStatus)) {
    return invalidResult(input, ['Unknown approval status supplied.'], outputSubjectType);
  }

  const requestedAtTime = parseTime(input.requestedAt);
  if (requestedAtTime === null) {
    return invalidResult(input, ['requestedAt must be parseable as an ISO-ish timestamp.'], outputSubjectType);
  }

  const nowTime = parseTime(input.now);
  if (nowTime === null) {
    return invalidResult(input, ['now must be parseable as an ISO-ish timestamp.'], outputSubjectType);
  }

  const riskReason = highRiskReason(outputSubjectType);
  const highRiskReasons = riskReason ? [riskReason] : [];

  const cleanedExpiresAt = clean(input.expiresAt);
  const expiresTime = cleanedExpiresAt ? parseTime(cleanedExpiresAt) : null;
  if (cleanedExpiresAt && expiresTime === null) {
    return invalidResult(input, ['expiresAt must be parseable as an ISO-ish timestamp when supplied.'], outputSubjectType);
  }

  if (expiresTime !== null && rawStatus !== 'executed') {
    if (nowTime > expiresTime) {
      const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'do_not_execute');
      return {
        id: input.id,
        subjectType: outputSubjectType,
        normalizedStatus: 'expired',
        decision: 'do_not_execute',
        requiresPhillReview: false,
        reasons: [`Approval expired at ${cleanedExpiresAt} and must not be executed.`, ...highRiskReasons],
        safeToAutoExecute: autoExec.safe,
        autoExecuteReason: autoExec.reason,
      };
    }
  }

  if (rawStatus === 'requested') {
    const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'await_approval');
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'requested',
      decision: 'await_approval',
      requiresPhillReview: true,
      reasons: ['Approval is awaiting approval from Phill/Board before execution.', ...highRiskReasons],
      safeToAutoExecute: autoExec.safe,
      autoExecuteReason: autoExec.reason,
    };
  }

  if (rawStatus === 'approved') {
    if (!clean(input.approvedBy) || !clean(input.approvalReference)) {
      return invalidResult(input, ['Approved approvals require both approvedBy and approvalReference before execution can be recommended.'], outputSubjectType);
    }

    const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'may_execute');
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'approved',
      decision: 'may_execute',
      requiresPhillReview: riskReason !== null,
      reasons: [
        'Approval was approved by recorded approver with approval reference recorded; manual execution may proceed within scope.',
        ...highRiskReasons,
      ],
      safeToAutoExecute: autoExec.safe,
      autoExecuteReason: autoExec.reason,
    };
  }

  if (rawStatus === 'rejected') {
    const rejectionDetail = clean(input.rejectionReason) ? ' Rejection reason recorded.' : '';
    const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'do_not_execute');
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'rejected',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: [`Approval was rejected and must not be executed.${rejectionDetail}`, ...highRiskReasons],
      safeToAutoExecute: autoExec.safe,
      autoExecuteReason: autoExec.reason,
    };
  }

  if (rawStatus === 'cancelled') {
    const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'do_not_execute');
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'cancelled',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: ['Approval was cancelled and must not be executed.', ...highRiskReasons],
      safeToAutoExecute: autoExec.safe,
      autoExecuteReason: autoExec.reason,
    };
  }

  if (rawStatus === 'expired') {
    const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'do_not_execute');
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'expired',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: ['Approval is expired and must not be executed.', ...highRiskReasons],
      safeToAutoExecute: autoExec.safe,
      autoExecuteReason: autoExec.reason,
    };
  }

  const cleanedExecutedAt = clean(input.executedAt);
  if (!cleanedExecutedAt) {
    return invalidResult(input, ['Executed approvals require executedAt.'], outputSubjectType);
  }
  if (parseTime(cleanedExecutedAt) === null) {
    return invalidResult(input, ['executedAt must be parseable as an ISO-ish timestamp when supplied.'], outputSubjectType);
  }

  const autoExec = evaluateDecisionGatedAutoExecute(outputSubjectType, 'already_executed');
  return {
    id: input.id,
    subjectType: outputSubjectType,
    normalizedStatus: 'executed',
    decision: 'already_executed',
    requiresPhillReview: false,
    reasons: [`Approval already executed at ${cleanedExecutedAt}.`, ...highRiskReasons],
    safeToAutoExecute: autoExec.safe,
    autoExecuteReason: autoExec.reason,
  };
}
