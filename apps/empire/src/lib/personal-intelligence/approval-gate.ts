import { redactSensitiveText } from './redaction';
import type { ApprovalDryRun, ApprovalDryRunAction, ApprovalDryRunItem } from './approval-dry-run';

export type ApprovalGateRequestedActionType =
  | 'memory_apply_request'
  | 'task_apply_request'
  | 'future_queue_apply_request'
  | 'archive_marker_apply_request'
  | 'hold_apply_request';

export type ApprovalGateApplyState = 'pending_human_gate';
export type ApprovalGateRiskLevel = 'low' | 'medium' | 'high';

export interface ApprovalGateInput {
  gateName?: string;
  generatedAt: string;
  preparedBy: string;
  approvalDryRunPath: string;
  dryRun: ApprovalDryRun;
}

export interface ApprovalGateApplyRequest {
  id: string;
  phase: '1H';
  sourceDryRunId: string;
  sourceCandidateId: string;
  sourceReviewStatus: ApprovalDryRunItem['sourceReviewStatus'];
  sourceDecisionType: ApprovalDryRunAction;
  requestedActionType: ApprovalGateRequestedActionType;
  rationale: string;
  riskLevel: ApprovalGateRiskLevel;
  requiresHumanApproval: true;
  applyState: ApprovalGateApplyState;
  createdAt: string;
  evidenceRefs: string[];
  guardrailFlags: string[];
  noSideEffectDeclaration: true;
  title: string;
}

export interface ApprovalGate {
  gateName: string;
  generatedAt: string;
  preparedBy: string;
  approvalDryRunPath: string;
  approvalHandoffPath: string;
  approvalLedgerPath: string;
  sourceRegisterPath: string;
  sourceNotePath: string;
  applyRequests: ApprovalGateApplyRequest[];
  sideEffectBoundaries: string[];
}

const SAFE_APPROVAL_DRY_RUN_PREFIX = 'docs/margot/personal-intelligence/approval-dry-run/';
const SAFE_APPROVAL_HANDOFF_PREFIX = 'docs/margot/personal-intelligence/approval-handoff/';
const SAFE_APPROVAL_LEDGER_PREFIX = 'docs/margot/personal-intelligence/approval-ledger/';
const SAFE_SOURCE_NOTE_PREFIX = 'docs/margot/personal-intelligence/nexus-mapping-notes/';
const SAFE_REGISTER_PREFIX = 'docs/margot/personal-intelligence/candidate-register/';
const VALID_DRY_RUN_ACTIONS = new Set([
  'dry_run_memory_write_request',
  'dry_run_task_draft',
  'dry_run_future_review_queue_item',
  'dry_run_archive_evidence_marker',
  'dry_run_no_op_hold',
]);
const VALID_SOURCE_REVIEW_STATUSES = new Set(['approved', 'rejected', 'parked', 'pending_review']);
const VALID_CANDIDATE_TYPES = new Set(['memory', 'task', 'waste', 'experiment']);
const VALID_EXECUTION_STATUSES = new Set(['not_executed']);
const VALID_SIDE_EFFECT_BOUNDARIES = new Set(['dry-run-only-no-execution']);
const VALID_SOURCE_ACTION_TYPES = new Set([
  'memory_write_proposal',
  'task_draft_proposal',
  'future_review_proposal',
  'evidence_only',
  'pending_review_hold',
]);
const VALID_NEXUS_DESTINATIONS = new Set([
  'crm',
  'client_2nd_brain',
  'marketing_strategy',
  'ai_enhancement_pipeline',
  'agentic_thinking',
  'product_roadmap',
  'project_portfolio',
  'memory_candidate',
  'task_candidate',
  'parked_research',
  'waste_register',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(message);
  return value;
}

function assertSafeRelativePath(value: string, safePrefix: string, message: string): void {
  if (!value.startsWith(safePrefix) || value.includes('..')) {
    throw new Error(`${message} must stay under ${safePrefix.replace(/\/$/, '')}`);
  }
}

function slugify(value: string): string {
  return redactSensitiveText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'approval-gate-apply-request';
}

function markdownCell(value: string): string {
  return redactSensitiveText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function requestedActionTypeForDryRunAction(action: ApprovalDryRunAction): ApprovalGateRequestedActionType {
  if (action === 'dry_run_memory_write_request') return 'memory_apply_request';
  if (action === 'dry_run_task_draft') return 'task_apply_request';
  if (action === 'dry_run_future_review_queue_item') return 'future_queue_apply_request';
  if (action === 'dry_run_archive_evidence_marker') return 'archive_marker_apply_request';
  if (action === 'dry_run_no_op_hold') return 'hold_apply_request';
  throw new Error(`Invalid Approval Gate input: dryRunAction is invalid`);
}

function riskLevelForAction(action: ApprovalGateRequestedActionType): ApprovalGateRiskLevel {
  if (action === 'memory_apply_request' || action === 'task_apply_request') return 'high';
  if (action === 'future_queue_apply_request') return 'medium';
  return 'low';
}

function guardrailsForItem(item: ApprovalDryRunItem, requestedActionType: ApprovalGateRequestedActionType): string[] {
  const flags = ['human_gate_required', 'no_side_effects_declared'];
  if (requestedActionType === 'memory_apply_request') flags.push('durable_memory_write_blocked_until_separate_approval');
  if (requestedActionType === 'task_apply_request') flags.push('task_creation_execution_blocked_until_separate_approval');
  if (requestedActionType === 'future_queue_apply_request') flags.push('queue_mutation_blocked_local_request_only');
  if (requestedActionType === 'hold_apply_request') flags.push('pending_review_hold_no_op');
  if (item.candidateType === 'waste' || item.sourceReviewStatus === 'rejected' || requestedActionType === 'archive_marker_apply_request') {
    flags.push('waste_or_rejected_non_operational');
  }
  return flags;
}

function rationaleForItem(item: ApprovalDryRunItem, requestedActionType: ApprovalGateRequestedActionType): string {
  if (requestedActionType === 'memory_apply_request') {
    return `Prepare a human approval record for a possible durable-memory apply path only; do not write memory: ${item.wouldDo}`;
  }
  if (requestedActionType === 'task_apply_request') {
    return `Prepare a human approval record for a possible local task apply path only; do not create or execute tasks: ${item.wouldDo}`;
  }
  if (requestedActionType === 'future_queue_apply_request') {
    return `Prepare a human approval record for future review queue consideration only; do not mutate queues or create experiments: ${item.wouldDo}`;
  }
  if (requestedActionType === 'archive_marker_apply_request') {
    return `Prepare a human approval record for local archive/evidence marking only; keep non-operational: ${item.wouldDo}`;
  }
  return `Prepare a human approval record for a no-op hold only; await explicit review before any downstream step: ${item.wouldDo}`;
}

function validateDecisionPair(index: number, item: ApprovalDryRunItem, requestedActionType: ApprovalGateRequestedActionType): void {
  if (item.candidateType === 'waste') {
    if (requestedActionType !== 'archive_marker_apply_request') {
      throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] waste dry-run items must map to archive_marker_apply_request only`);
    }
    return;
  }

  if (item.sourceReviewStatus === 'pending_review' && requestedActionType !== 'hold_apply_request') {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] pending_review dry-run items must map to hold_apply_request only`);
  }

  if ((item.candidateType === 'memory' || item.candidateType === 'task') && requestedActionType === 'future_queue_apply_request') {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] memory/task dry-run items must not map to future_queue_apply_request`);
  }

  const allowedPairs: Record<ApprovalDryRunAction, ApprovalGateRequestedActionType> = {
    dry_run_memory_write_request: 'memory_apply_request',
    dry_run_task_draft: 'task_apply_request',
    dry_run_future_review_queue_item: 'future_queue_apply_request',
    dry_run_archive_evidence_marker: 'archive_marker_apply_request',
    dry_run_no_op_hold: 'hold_apply_request',
  };
  if (allowedPairs[item.dryRunAction] !== requestedActionType) {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] contradictory sourceDecisionType + requestedActionType pair`);
  }

  const sourcePairByDryRun: Record<ApprovalDryRunAction, string> = {
    dry_run_memory_write_request: 'memory_write_proposal',
    dry_run_task_draft: 'task_draft_proposal',
    dry_run_future_review_queue_item: 'future_review_proposal',
    dry_run_archive_evidence_marker: 'evidence_only',
    dry_run_no_op_hold: 'pending_review_hold',
  };
  if (sourcePairByDryRun[item.dryRunAction] !== item.sourceActionType) {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] contradictory sourceDecisionType + requestedActionType pair`);
  }

  if (requestedActionType === 'memory_apply_request' && (item.candidateType !== 'memory' || item.sourceReviewStatus !== 'approved')) {
    throw new Error(
      `Invalid Approval Gate input: dryRunItems[${index}] memory apply requests must originate from approved memory dry-run items`,
    );
  }

  if (requestedActionType === 'task_apply_request' && (item.candidateType !== 'task' || item.sourceReviewStatus !== 'approved')) {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] task apply requests must originate from approved task dry-run items`);
  }

  if (requestedActionType === 'future_queue_apply_request') {
    if (item.sourceReviewStatus !== 'approved' && item.sourceReviewStatus !== 'parked') {
      throw new Error(
        `Invalid Approval Gate input: dryRunItems[${index}] future queue apply requests must originate from approved or parked dry-run items`,
      );
    }
    if (item.candidateType === 'memory' || item.candidateType === 'task') {
      throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] memory/task/waste dry-run items must not map to future_queue_apply_request`);
    }
  }

  if (requestedActionType === 'archive_marker_apply_request' && item.sourceReviewStatus !== 'rejected') {
    throw new Error(
      `Invalid Approval Gate input: dryRunItems[${index}] archive marker apply requests must originate from waste or rejected evidence dry-run items`,
    );
  }

  if (requestedActionType === 'hold_apply_request' && item.sourceReviewStatus !== 'pending_review') {
    throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] hold apply requests must originate from pending_review dry-run items`);
  }
}

function validateDryRunItem(value: unknown, index: number): ApprovalDryRunItem {
  if (!isPlainObject(value)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}] must be an object`);
  requiredString(value.dryRunItemId, `Invalid Approval Gate input: dryRunItems[${index}].sourceDryRunId is required`);
  requiredString(value.candidateId, `Invalid Approval Gate input: dryRunItems[${index}].sourceCandidateId is required`);
  const sourceReviewStatus = requiredString(value.sourceReviewStatus, `Invalid Approval Gate input: dryRunItems[${index}].sourceReviewStatus is required`);
  if (!VALID_SOURCE_REVIEW_STATUSES.has(sourceReviewStatus)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].sourceReviewStatus is invalid`);
  const candidateType = requiredString(value.candidateType, `Invalid Approval Gate input: dryRunItems[${index}].candidateType is required`);
  if (!VALID_CANDIDATE_TYPES.has(candidateType)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].candidateType is invalid`);
  const dryRunAction = requiredString(value.dryRunAction, `Invalid Approval Gate input: dryRunItems[${index}].dryRunAction is required`);
  if (!VALID_DRY_RUN_ACTIONS.has(dryRunAction)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].dryRunAction is invalid`);
  const sourceActionType = requiredString(value.sourceActionType, `Invalid Approval Gate input: dryRunItems[${index}].sourceActionType is required`);
  if (!VALID_SOURCE_ACTION_TYPES.has(sourceActionType)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].sourceActionType is invalid`);
  const executionStatus = requiredString(value.executionStatus, `Invalid Approval Gate input: dryRunItems[${index}].executionStatus is required`);
  if (!VALID_EXECUTION_STATUSES.has(executionStatus)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].executionStatus must be not_executed`);
  const sideEffectBoundary = requiredString(value.sideEffectBoundary, `Invalid Approval Gate input: dryRunItems[${index}].sideEffectBoundary is required`);
  if (!VALID_SIDE_EFFECT_BOUNDARIES.has(sideEffectBoundary)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].sideEffectBoundary must be dry-run-only-no-execution`);
  const nexusDestination = requiredString(value.nexusDestination, `Invalid Approval Gate input: dryRunItems[${index}].nexusDestination is required`);
  if (!VALID_NEXUS_DESTINATIONS.has(nexusDestination)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].nexusDestination is invalid`);
  requiredString(value.actionPackId, `Invalid Approval Gate input: dryRunItems[${index}].actionPackId is required`);
  requiredString(value.title, `Invalid Approval Gate input: dryRunItems[${index}].title is required`);
  requiredString(value.wouldDo, `Invalid Approval Gate input: dryRunItems[${index}].wouldDo is required`);
  if (!Array.isArray(value.mustNotDo)) throw new Error(`Invalid Approval Gate input: dryRunItems[${index}].mustNotDo is required`);
  requiredString(value.verificationStep, `Invalid Approval Gate input: dryRunItems[${index}].verificationStep is required`);
  const sourceNotePath = requiredString(value.sourceNotePath, `Invalid Approval Gate input: dryRunItems[${index}].sourceNotePath is required`);
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, `Invalid Approval Gate input: dryRunItems[${index}].sourceNotePath`);
  const approvalLedgerPath = requiredString(value.approvalLedgerPath, `Invalid Approval Gate input: dryRunItems[${index}].approvalLedgerPath is required`);
  assertSafeRelativePath(approvalLedgerPath, SAFE_APPROVAL_LEDGER_PREFIX, `Invalid Approval Gate input: dryRunItems[${index}].approvalLedgerPath`);
  const approvalHandoffPath = requiredString(value.approvalHandoffPath, `Invalid Approval Gate input: dryRunItems[${index}].approvalHandoffPath is required`);
  assertSafeRelativePath(approvalHandoffPath, SAFE_APPROVAL_HANDOFF_PREFIX, `Invalid Approval Gate input: dryRunItems[${index}].approvalHandoffPath`);
  requiredString(value.generatedAt, `Invalid Approval Gate input: dryRunItems[${index}].generatedAt is required`);

  const item = value as unknown as ApprovalDryRunItem;
  validateDecisionPair(index, item, requestedActionTypeForDryRunAction(item.dryRunAction));
  return item;
}

function validateDryRun(value: unknown): ApprovalDryRun {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Gate input: dryRun is required');
  requiredString(value.generatedAt, 'Invalid Approval Gate input: dryRun.generatedAt is required');
  requiredString(value.preparedBy, 'Invalid Approval Gate input: dryRun.preparedBy is required');
  const approvalHandoffPath = requiredString(value.approvalHandoffPath, 'Invalid Approval Gate input: dryRun.approvalHandoffPath is required');
  assertSafeRelativePath(approvalHandoffPath, SAFE_APPROVAL_HANDOFF_PREFIX, 'Invalid Approval Gate input: dryRun.approvalHandoffPath');
  const approvalLedgerPath = requiredString(value.approvalLedgerPath, 'Invalid Approval Gate input: dryRun.approvalLedgerPath is required');
  assertSafeRelativePath(approvalLedgerPath, SAFE_APPROVAL_LEDGER_PREFIX, 'Invalid Approval Gate input: dryRun.approvalLedgerPath');
  const sourceRegisterPath = requiredString(value.sourceRegisterPath, 'Invalid Approval Gate input: dryRun.sourceRegisterPath is required');
  assertSafeRelativePath(sourceRegisterPath, SAFE_REGISTER_PREFIX, 'Invalid Approval Gate input: dryRun.sourceRegisterPath');
  const sourceNotePath = requiredString(value.sourceNotePath, 'Invalid Approval Gate input: dryRun.sourceNotePath is required');
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, 'Invalid Approval Gate input: dryRun.sourceNotePath');
  if (!Array.isArray(value.dryRunItems)) throw new Error('Invalid Approval Gate input: dryRun.dryRunItems is required');
  if (!Array.isArray(value.sideEffectBoundaries)) throw new Error('Invalid Approval Gate input: dryRun.sideEffectBoundaries is required');

  const seenDryRunIds = new Set<string>();
  value.dryRunItems.forEach((item, index) => {
    const validatedItem = validateDryRunItem(item, index);
    if (seenDryRunIds.has(validatedItem.dryRunItemId)) {
      throw new Error(`Invalid Approval Gate input: duplicate source dry-run id: ${validatedItem.dryRunItemId}`);
    }
    seenDryRunIds.add(validatedItem.dryRunItemId);
  });

  value.sideEffectBoundaries.forEach((boundary, index) => {
    if (typeof boundary !== 'string' || boundary.trim().length === 0) {
      throw new Error(`Invalid Approval Gate input: dryRun.sideEffectBoundaries[${index}] must be a string`);
    }
  });

  return value as unknown as ApprovalDryRun;
}

export function validateApprovalGateInput(value: unknown): ApprovalGateInput {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Gate input: expected object');
  const generatedAt = requiredString(value.generatedAt, 'Invalid Approval Gate input: generatedAt is required');
  const approvalDryRunPath = requiredString(value.approvalDryRunPath, 'Invalid Approval Gate input: approvalDryRunPath is required');
  const preparedBy = requiredString(value.preparedBy, 'Invalid Approval Gate input: preparedBy is required');
  assertSafeRelativePath(approvalDryRunPath, SAFE_APPROVAL_DRY_RUN_PREFIX, 'Invalid Approval Gate input: approvalDryRunPath');
  const gateName = typeof value.gateName === 'string' && value.gateName.trim().length > 0 ? value.gateName : undefined;
  return { gateName, generatedAt, preparedBy, approvalDryRunPath, dryRun: validateDryRun(value.dryRun) };
}

function buildApplyRequest(item: ApprovalDryRunItem, input: ApprovalGateInput): ApprovalGateApplyRequest {
  const requestedActionType = requestedActionTypeForDryRunAction(item.dryRunAction);
  return {
    id: slugify(`${item.candidateId}-${requestedActionType}-${input.generatedAt}`),
    phase: '1H',
    sourceDryRunId: redactSensitiveText(item.dryRunItemId),
    sourceCandidateId: redactSensitiveText(item.candidateId),
    sourceReviewStatus: item.sourceReviewStatus,
    sourceDecisionType: item.dryRunAction,
    requestedActionType,
    rationale: redactSensitiveText(rationaleForItem(item, requestedActionType)),
    riskLevel: riskLevelForAction(requestedActionType),
    requiresHumanApproval: true,
    applyState: 'pending_human_gate',
    createdAt: input.generatedAt,
    evidenceRefs: [
      redactSensitiveText(input.approvalDryRunPath),
      redactSensitiveText(item.approvalHandoffPath),
      redactSensitiveText(item.approvalLedgerPath),
      redactSensitiveText(item.sourceNotePath),
    ],
    guardrailFlags: guardrailsForItem(item, requestedActionType),
    noSideEffectDeclaration: true,
    title: redactSensitiveText(item.title),
  };
}

export function buildApprovalGate(rawInput: ApprovalGateInput): ApprovalGate {
  const input = validateApprovalGateInput(rawInput);
  const applyRequests = input.dryRun.dryRunItems.map((item) => buildApplyRequest(item, input));
  const seenIds = new Set<string>();
  applyRequests.forEach((request) => {
    if (seenIds.has(request.id)) throw new Error(`Invalid Approval Gate input: duplicate apply request id: ${request.id}`);
    seenIds.add(request.id);
  });

  return {
    gateName: redactSensitiveText(input.gateName ?? 'approval-gate'),
    generatedAt: input.generatedAt,
    preparedBy: redactSensitiveText(input.preparedBy),
    approvalDryRunPath: redactSensitiveText(input.approvalDryRunPath),
    approvalHandoffPath: redactSensitiveText(input.dryRun.approvalHandoffPath),
    approvalLedgerPath: redactSensitiveText(input.dryRun.approvalLedgerPath),
    sourceRegisterPath: redactSensitiveText(input.dryRun.sourceRegisterPath),
    sourceNotePath: redactSensitiveText(input.dryRun.sourceNotePath),
    applyRequests,
    sideEffectBoundaries: [
      'No durable memory writes occurred.',
      'No task creation or execution occurred.',
      'No experiment creation occurred.',
      'No routing or queue mutation outside local draft artifacts occurred.',
      'No external API mutation, production DB write, deployment, or client-facing output occurred.',
      'No apply execution path was created or invoked.',
      'Phase 1H apply-request records remain pending_human_gate and require separate explicit human approval before any future side effect.',
    ],
  };
}

export function renderApprovalGateMarkdown(gate: ApprovalGate): string {
  return [
    '# Personal Intelligence Approval Gate Apply Requests',
    '',
    `Gate name: ${markdownCell(gate.gateName)}`,
    `Generated at: ${gate.generatedAt}`,
    `Prepared by: ${markdownCell(gate.preparedBy)}`,
    `Approval dry-run: ${markdownCell(gate.approvalDryRunPath)}`,
    `Approval handoff: ${markdownCell(gate.approvalHandoffPath)}`,
    `Approval ledger: ${markdownCell(gate.approvalLedgerPath)}`,
    `Source register: ${markdownCell(gate.sourceRegisterPath)}`,
    `Source note: ${markdownCell(gate.sourceNotePath)}`,
    '',
    '## Pending human-gate apply requests',
    '',
    '| Apply request | Source dry-run | Candidate | Review status | Source decision | Requested action | Risk | Apply state | Title | Rationale |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...gate.applyRequests.map(
      (request) =>
        `| ${markdownCell(request.id)} | ${markdownCell(request.sourceDryRunId)} | ${markdownCell(request.sourceCandidateId)} | ${request.sourceReviewStatus} | ${request.sourceDecisionType} | ${request.requestedActionType} | ${request.riskLevel} | ${request.applyState} | ${markdownCell(request.title)} | ${markdownCell(request.rationale)} |`,
    ),
    '',
    '## Operator workflow',
    '',
    '1. Review each apply request against its evidence refs and guardrail flags.',
    '2. Confirm the requested action remains the deterministic Phase 1H mapping target.',
    '3. Keep all records in `pending_human_gate` until a later separately approved phase defines an apply path.',
    '4. Reject or hold any record with missing evidence, contradictory status, or unclear human approval.',
    '',
    '## Approval-gate boundaries',
    '',
    'This artifact is a local approval-gate draft only. It does not apply, create, write, execute, route, publish, deploy, or mutate anything.',
    ...gate.sideEffectBoundaries.map((boundary) => `- ${markdownCell(boundary)}`),
    '',
  ].join('\n');
}
