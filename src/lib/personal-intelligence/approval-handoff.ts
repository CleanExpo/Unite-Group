import { redactSensitiveText } from './redaction';
import type {
  CandidateApprovalCurrentStatus,
  CandidateApprovalLedger,
  CandidateApprovalStatusSnapshot,
} from './candidate-approval-ledger';
import type { CandidateRegisterEntry } from './candidate-register';

export type ApprovalHandoffActionType =
  | 'memory_write_proposal'
  | 'task_draft_proposal'
  | 'future_review_proposal'
  | 'evidence_only'
  | 'pending_review_hold';

export type ApprovalHandoffReviewStatus = 'requires_human_review' | 'parked' | 'closed_no_action' | 'pending_decision';

export interface ApprovalHandoffInput {
  generatedAt: string;
  preparedBy: string;
  approvalLedgerPath: string;
  ledger: CandidateApprovalLedger;
}

export interface ApprovalHandoffActionPack {
  actionPackId: string;
  candidateId: string;
  candidateType: CandidateRegisterEntry['candidateType'];
  sourceReviewStatus: CandidateApprovalCurrentStatus;
  actionType: ApprovalHandoffActionType;
  reviewStatus: ApprovalHandoffReviewStatus;
  nexusDestination: CandidateRegisterEntry['nexusDestination'];
  title: string;
  proposal: string;
  allowedDownstreamAction: string;
  prohibitedActions: string[];
  verificationStep: string;
  sourceNotePath: string;
  approvalLedgerPath: string;
  sideEffectBoundary: 'proposal-only-no-execution';
  generatedAt: string;
}

export interface ApprovalHandoff {
  generatedAt: string;
  preparedBy: string;
  approvalLedgerPath: string;
  sourceRegisterPath: string;
  sourceNotePath: string;
  actionPacks: ApprovalHandoffActionPack[];
  sideEffectBoundaries: string[];
}

const SAFE_APPROVAL_LEDGER_PREFIX = 'docs/margot/personal-intelligence/approval-ledger/';
const SAFE_SOURCE_NOTE_PREFIX = 'docs/margot/personal-intelligence/nexus-mapping-notes/';
const SAFE_REGISTER_PREFIX = 'docs/margot/personal-intelligence/candidate-register/';
const VALID_CANDIDATE_TYPES = new Set(['memory', 'task', 'waste', 'experiment']);
const VALID_CURRENT_STATUSES = new Set(['approved', 'rejected', 'parked', 'pending_review']);
const VALID_SOURCE_APPROVAL_STATUSES = new Set(['draft', 'needs_approval', 'approved', 'rejected']);
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
    .slice(0, 80) || 'approval-handoff-action';
}

function markdownCell(value: string): string {
  return redactSensitiveText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function validateLedgerStatus(value: unknown, index: number): CandidateApprovalStatusSnapshot {
  if (!isPlainObject(value)) throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}] must be an object`);
  const candidateId = requiredString(value.candidateId, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].candidateId is required`);
  const candidateType = requiredString(value.candidateType, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].candidateType is required`);
  if (!VALID_CANDIDATE_TYPES.has(candidateType)) {
    throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}].candidateType must be memory, task, waste, or experiment`);
  }
  const sourceApprovalStatus = requiredString(
    value.sourceApprovalStatus,
    `Invalid Approval Handoff input: ledger.currentStatuses[${index}].sourceApprovalStatus is required`,
  );
  if (!VALID_SOURCE_APPROVAL_STATUSES.has(sourceApprovalStatus)) {
    throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}].sourceApprovalStatus must be draft, needs_approval, approved, or rejected`);
  }
  const currentStatus = requiredString(value.currentStatus, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].currentStatus is required`);
  if (!VALID_CURRENT_STATUSES.has(currentStatus)) {
    throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}].currentStatus must be approved, rejected, parked, or pending_review`);
  }
  const nexusDestination = requiredString(
    value.nexusDestination,
    `Invalid Approval Handoff input: ledger.currentStatuses[${index}].nexusDestination is required`,
  );
  if (!VALID_NEXUS_DESTINATIONS.has(nexusDestination)) {
    throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}].nexusDestination is not a known Nexus destination`);
  }
  requiredString(value.title, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].title is required`);
  requiredString(value.usefulSignal, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].usefulSignal is required`);
  requiredString(value.allowedNextAction, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].allowedNextAction is required`);
  requiredString(value.verificationStep, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].verificationStep is required`);
  const sourceNotePath = requiredString(value.sourceNotePath, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].sourceNotePath is required`);
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].sourceNotePath`);
  const registerPath = requiredString(value.registerPath, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].registerPath is required`);
  assertSafeRelativePath(registerPath, SAFE_REGISTER_PREFIX, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].registerPath`);
  const sideEffectBoundary = requiredString(
    value.sideEffectBoundary,
    `Invalid Approval Handoff input: ledger.currentStatuses[${index}].sideEffectBoundary is required`,
  );
  if (sideEffectBoundary !== 'no-execution') {
    throw new Error(`Invalid Approval Handoff input: ledger.currentStatuses[${index}].sideEffectBoundary must be no-execution`);
  }
  requiredString(value.updatedAt, `Invalid Approval Handoff input: ledger.currentStatuses[${index}].updatedAt is required`);
  return value as unknown as CandidateApprovalStatusSnapshot;
}

function validateLedger(value: unknown): CandidateApprovalLedger {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Handoff input: ledger is required');
  requiredString(value.generatedAt, 'Invalid Approval Handoff input: ledger.generatedAt is required');
  requiredString(value.reviewer, 'Invalid Approval Handoff input: ledger.reviewer is required');
  const registerPath = requiredString(value.registerPath, 'Invalid Approval Handoff input: ledger.registerPath is required');
  assertSafeRelativePath(registerPath, SAFE_REGISTER_PREFIX, 'Invalid Approval Handoff input: ledger.registerPath');
  const sourceNotePath = requiredString(value.sourceNotePath, 'Invalid Approval Handoff input: ledger.sourceNotePath is required');
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, 'Invalid Approval Handoff input: ledger.sourceNotePath');
  if (!Array.isArray(value.currentStatuses)) throw new Error('Invalid Approval Handoff input: ledger.currentStatuses is required');
  if (!Array.isArray(value.auditTrail)) throw new Error('Invalid Approval Handoff input: ledger.auditTrail is required');
  if (!Array.isArray(value.sideEffectBoundaries)) throw new Error('Invalid Approval Handoff input: ledger.sideEffectBoundaries is required');

  const seenCandidateIds = new Set<string>();
  value.currentStatuses.forEach((status, index) => {
    const validatedStatus = validateLedgerStatus(status, index);
    if (seenCandidateIds.has(validatedStatus.candidateId)) {
      throw new Error(`Invalid Approval Handoff input: duplicate ledger candidateId: ${validatedStatus.candidateId}`);
    }
    seenCandidateIds.add(validatedStatus.candidateId);
  });

  value.sideEffectBoundaries.forEach((boundary, index) => {
    if (typeof boundary !== 'string' || boundary.trim().length === 0) {
      throw new Error(`Invalid Approval Handoff input: ledger.sideEffectBoundaries[${index}] must be a string`);
    }
  });

  return value as unknown as CandidateApprovalLedger;
}

export function validateApprovalHandoffInput(value: unknown): ApprovalHandoffInput {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Handoff input: expected object');
  const generatedAt = requiredString(value.generatedAt, 'Invalid Approval Handoff input: generatedAt is required');
  const approvalLedgerPath = requiredString(value.approvalLedgerPath, 'Invalid Approval Handoff input: approvalLedgerPath is required');
  const preparedBy = requiredString(value.preparedBy, 'Invalid Approval Handoff input: preparedBy is required');
  assertSafeRelativePath(approvalLedgerPath, SAFE_APPROVAL_LEDGER_PREFIX, 'Invalid Approval Handoff input: approvalLedgerPath');
  return { generatedAt, preparedBy, approvalLedgerPath, ledger: validateLedger(value.ledger) };
}

function actionTypeForStatus(status: CandidateApprovalStatusSnapshot): ApprovalHandoffActionType {
  if (status.candidateType === 'waste') return 'evidence_only';
  if (status.currentStatus === 'approved' && status.candidateType === 'memory') return 'memory_write_proposal';
  if (status.currentStatus === 'approved' && status.candidateType === 'task') return 'task_draft_proposal';
  if (status.currentStatus === 'approved' || status.currentStatus === 'parked') return 'future_review_proposal';
  if (status.currentStatus === 'rejected') return 'evidence_only';
  return 'pending_review_hold';
}

function reviewStatusForAction(actionType: ApprovalHandoffActionType): ApprovalHandoffReviewStatus {
  if (actionType === 'memory_write_proposal' || actionType === 'task_draft_proposal') return 'requires_human_review';
  if (actionType === 'future_review_proposal') return 'parked';
  if (actionType === 'evidence_only') return 'closed_no_action';
  return 'pending_decision';
}

function allowedDownstreamAction(status: CandidateApprovalStatusSnapshot, actionType: ApprovalHandoffActionType): string {
  if (actionType === 'memory_write_proposal') {
    return 'Draft a separate durable-memory write request for human approval; do not write memory from this handoff.';
  }
  if (actionType === 'task_draft_proposal') {
    return 'Draft a separate local task proposal for human approval; do not create or execute a task from this handoff.';
  }
  if (actionType === 'future_review_proposal') {
    return 'Keep as a future-review proposal only; do not create an experiment, route work, or publish output from this handoff.';
  }
  if (actionType === 'evidence_only') {
    return 'Retain as local evidence only; do not operationalize, route, or resurrect without a new explicit approval.';
  }
  return 'Hold for explicit human decision; do not create memory, tasks, experiments, routes, or production changes.';
}

function proposalText(status: CandidateApprovalStatusSnapshot, actionType: ApprovalHandoffActionType): string {
  if (actionType === 'memory_write_proposal') {
    return `Memory write proposal only: ${status.usefulSignal}`;
  }
  if (actionType === 'task_draft_proposal') {
    return `Task draft proposal only: ${status.title}. Signal: ${status.usefulSignal}`;
  }
  if (actionType === 'future_review_proposal') {
    return `Future review proposal only: ${status.title}. Preserve signal without execution.`;
  }
  if (actionType === 'evidence_only') {
    return `Evidence-only record: ${status.title}. Keep closed unless separately re-approved.`;
  }
  return `Pending review hold: ${status.title}. Await explicit ledger decision.`;
}

function actionPack(status: CandidateApprovalStatusSnapshot, input: ApprovalHandoffInput): ApprovalHandoffActionPack {
  const actionType = actionTypeForStatus(status);
  return {
    actionPackId: slugify(`${status.candidateId}-${actionType}-${input.generatedAt}`),
    candidateId: redactSensitiveText(status.candidateId),
    candidateType: status.candidateType,
    sourceReviewStatus: status.currentStatus,
    actionType,
    reviewStatus: reviewStatusForAction(actionType),
    nexusDestination: status.nexusDestination,
    title: redactSensitiveText(status.title),
    proposal: redactSensitiveText(proposalText(status, actionType)),
    allowedDownstreamAction: allowedDownstreamAction(status, actionType),
    prohibitedActions: [
      'Do not write durable memory from this handoff.',
      'Do not create or execute tasks from this handoff.',
      'Do not create experiments, deploy, publish, or write production data from this handoff.',
      'Do not send client-facing communications from this handoff.',
    ],
    verificationStep: redactSensitiveText(status.verificationStep),
    sourceNotePath: redactSensitiveText(status.sourceNotePath),
    approvalLedgerPath: redactSensitiveText(input.approvalLedgerPath),
    sideEffectBoundary: 'proposal-only-no-execution',
    generatedAt: input.generatedAt,
  };
}

export function buildApprovalHandoff(rawInput: ApprovalHandoffInput): ApprovalHandoff {
  const input = validateApprovalHandoffInput(rawInput);
  return {
    generatedAt: input.generatedAt,
    preparedBy: redactSensitiveText(input.preparedBy),
    approvalLedgerPath: redactSensitiveText(input.approvalLedgerPath),
    sourceRegisterPath: redactSensitiveText(input.ledger.registerPath),
    sourceNotePath: redactSensitiveText(input.ledger.sourceNotePath),
    actionPacks: input.ledger.currentStatuses.map((status) => actionPack(status, input)),
    sideEffectBoundaries: [
      'No durable memory writes occurred.',
      'No tasks, experiments, production writes, deployments, or client-facing actions occurred.',
      'Approved candidates are converted to proposal packs only and still require separate explicit human approval before any downstream side effect.',
      'Rejected, waste, parked, and pending candidates remain local evidence or review state only.',
    ],
  };
}

export function renderApprovalHandoffMarkdown(handoff: ApprovalHandoff): string {
  return [
    '# Personal Intelligence Approval Handoff Action Pack',
    '',
    `Generated at: ${handoff.generatedAt}`,
    `Prepared by: ${markdownCell(handoff.preparedBy)}`,
    `Approval ledger: ${markdownCell(handoff.approvalLedgerPath)}`,
    `Source register: ${markdownCell(handoff.sourceRegisterPath)}`,
    `Source note: ${markdownCell(handoff.sourceNotePath)}`,
    '',
    '## Human review action packs',
    '',
    '| Action pack | Candidate | Type | Ledger status | Handoff action | Review status | Destination | Title | Allowed downstream action |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...handoff.actionPacks.map(
      (pack) =>
        `| ${markdownCell(pack.actionPackId)} | ${markdownCell(pack.candidateId)} | ${pack.candidateType} | ${pack.sourceReviewStatus} | ${pack.actionType} | ${pack.reviewStatus} | ${pack.nexusDestination} | ${markdownCell(pack.title)} | ${markdownCell(pack.allowedDownstreamAction)} |`,
    ),
    '',
    '## Proposal boundaries',
    '',
    'No durable memory writes, task creation/execution, experiment creation, production writes, deployments, external integration mutation, or client-facing action occurred.',
    ...handoff.sideEffectBoundaries.map((boundary) => `- ${markdownCell(boundary)}`),
    '',
  ].join('\n');
}
