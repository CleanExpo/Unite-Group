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

export interface CrmApprovalLifecycleEvaluation {
  id: string;
  subjectType: CrmApprovalLifecycleSubjectType;
  normalizedStatus: CrmApprovalNormalizedStatus;
  decision: CrmApprovalDecision;
  requiresPhillReview: boolean;
  reasons: string[];
  safeToAutoExecute: false;
}

const KNOWN_SUBJECT_TYPES: CrmApprovalSubjectType[] = ['lead_conversion', 'opportunity_commitment', 'client_merge', 'data_export', 'other'];
const KNOWN_STATUSES: CrmApprovalKnownStatus[] = ['requested', 'approved', 'rejected', 'cancelled', 'executed', 'expired'];
const HIGH_RISK_SUBJECT_TYPES: CrmApprovalSubjectType[] = ['client_merge', 'data_export'];

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function invalidResult(
  input: CrmApprovalLifecycleInput,
  reasons: string[],
  subjectType: CrmApprovalLifecycleSubjectType = normalizedSubjectType(input.subjectType),
): CrmApprovalLifecycleEvaluation {
  return {
    id: input.id,
    subjectType,
    normalizedStatus: 'invalid',
    decision: 'invalid_request',
    requiresPhillReview: true,
    reasons,
    safeToAutoExecute: false,
  };
}

function isKnownStatus(status: string): status is CrmApprovalKnownStatus {
  return KNOWN_STATUSES.includes(status as CrmApprovalKnownStatus);
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
  const rawSubjectType = clean(input.subjectType);
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
    return invalidResult(input, [`Unknown approval subjectType: ${rawSubjectType || '(blank)'}.`], 'invalid');
  }

  const rawStatus = clean(input.status) || 'requested';
  if (!isKnownStatus(rawStatus)) {
    return invalidResult(input, [`Unknown approval status: ${rawStatus}.`], outputSubjectType);
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
      return {
        id: input.id,
        subjectType: outputSubjectType,
        normalizedStatus: 'expired',
        decision: 'do_not_execute',
        requiresPhillReview: false,
        reasons: [`Approval expired at ${cleanedExpiresAt} and must not be executed.`, ...highRiskReasons],
        safeToAutoExecute: false,
      };
    }
  }

  if (rawStatus === 'requested') {
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'requested',
      decision: 'await_approval',
      requiresPhillReview: true,
      reasons: ['Approval is awaiting approval from Phill/Board before execution.', ...highRiskReasons],
      safeToAutoExecute: false,
    };
  }

  if (rawStatus === 'approved') {
    if (!clean(input.approvedBy) || !clean(input.approvalReference)) {
      return invalidResult(input, ['Approved approvals require both approvedBy and approvalReference before execution can be recommended.'], outputSubjectType);
    }

    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'approved',
      decision: 'may_execute',
      requiresPhillReview: riskReason !== null,
      reasons: [
        `Approval was approved by ${clean(input.approvedBy)} with approval reference recorded; manual execution may proceed within scope.`,
        ...highRiskReasons,
      ],
      safeToAutoExecute: false,
    };
  }

  if (rawStatus === 'rejected') {
    const rejectionDetail = clean(input.rejectionReason) ? ` Rejection reason: ${clean(input.rejectionReason)}.` : '';
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'rejected',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: [`Approval was rejected and must not be executed.${rejectionDetail}`, ...highRiskReasons],
      safeToAutoExecute: false,
    };
  }

  if (rawStatus === 'cancelled') {
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'cancelled',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: ['Approval was cancelled and must not be executed.', ...highRiskReasons],
      safeToAutoExecute: false,
    };
  }

  if (rawStatus === 'expired') {
    return {
      id: input.id,
      subjectType: outputSubjectType,
      normalizedStatus: 'expired',
      decision: 'do_not_execute',
      requiresPhillReview: false,
      reasons: ['Approval is expired and must not be executed.', ...highRiskReasons],
      safeToAutoExecute: false,
    };
  }

  const cleanedExecutedAt = clean(input.executedAt);
  if (!cleanedExecutedAt) {
    return invalidResult(input, ['Executed approvals require executedAt.'], outputSubjectType);
  }
  if (parseTime(cleanedExecutedAt) === null) {
    return invalidResult(input, ['executedAt must be parseable as an ISO-ish timestamp when supplied.'], outputSubjectType);
  }

  return {
    id: input.id,
    subjectType: outputSubjectType,
    normalizedStatus: 'executed',
    decision: 'already_executed',
    requiresPhillReview: false,
    reasons: [`Approval already executed at ${cleanedExecutedAt}.`, ...highRiskReasons],
    safeToAutoExecute: false,
  };
}
