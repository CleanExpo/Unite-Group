import { redactSensitiveText } from './redaction';
import type {
  ApprovalHandoff,
  ApprovalHandoffActionPack,
  ApprovalHandoffActionType,
} from './approval-handoff';

export type ApprovalDryRunAction =
  | 'dry_run_memory_write_request'
  | 'dry_run_task_draft'
  | 'dry_run_future_review_queue_item'
  | 'dry_run_archive_evidence_marker'
  | 'dry_run_no_op_hold';

export type ApprovalDryRunExecutionStatus = 'not_executed';

export interface ApprovalDryRunInput {
  dryRunName?: string;
  generatedAt: string;
  preparedBy: string;
  approvalHandoffPath: string;
  handoff: ApprovalHandoff;
}

export interface ApprovalDryRunItem {
  dryRunItemId: string;
  actionPackId: string;
  candidateId: string;
  candidateType: ApprovalHandoffActionPack['candidateType'];
  sourceActionType: ApprovalHandoffActionType;
  sourceReviewStatus: ApprovalHandoffActionPack['sourceReviewStatus'];
  dryRunAction: ApprovalDryRunAction;
  executionStatus: ApprovalDryRunExecutionStatus;
  nexusDestination: ApprovalHandoffActionPack['nexusDestination'];
  title: string;
  wouldDo: string;
  mustNotDo: string[];
  verificationStep: string;
  sourceNotePath: string;
  approvalLedgerPath: string;
  approvalHandoffPath: string;
  sideEffectBoundary: 'dry-run-only-no-execution';
  generatedAt: string;
}

export interface ApprovalDryRun {
  dryRunName: string;
  generatedAt: string;
  preparedBy: string;
  approvalHandoffPath: string;
  approvalLedgerPath: string;
  sourceRegisterPath: string;
  sourceNotePath: string;
  dryRunItems: ApprovalDryRunItem[];
  sideEffectBoundaries: string[];
}

const SAFE_APPROVAL_HANDOFF_PREFIX = 'docs/margot/personal-intelligence/approval-handoff/';
const SAFE_APPROVAL_LEDGER_PREFIX = 'docs/margot/personal-intelligence/approval-ledger/';
const SAFE_SOURCE_NOTE_PREFIX = 'docs/margot/personal-intelligence/nexus-mapping-notes/';
const SAFE_REGISTER_PREFIX = 'docs/margot/personal-intelligence/candidate-register/';
const VALID_ACTION_TYPES = new Set([
  'memory_write_proposal',
  'task_draft_proposal',
  'future_review_proposal',
  'evidence_only',
  'pending_review_hold',
]);
const VALID_SOURCE_REVIEW_STATUSES = new Set(['approved', 'rejected', 'parked', 'pending_review']);
const VALID_REVIEW_STATUSES = new Set(['requires_human_review', 'parked', 'closed_no_action', 'pending_decision']);
const VALID_CANDIDATE_TYPES = new Set(['memory', 'task', 'waste', 'experiment']);
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
    .slice(0, 80) || 'approval-dry-run-item';
}

function markdownCell(value: string): string {
  return redactSensitiveText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function validateActionPackConsistency(
  index: number,
  candidateType: string,
  sourceReviewStatus: string,
  actionType: string,
  reviewStatus: string,
  nexusDestination: string,
): void {
  if (candidateType === 'waste') {
    if (actionType !== 'evidence_only') {
      throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}] waste action packs must remain evidence_only`);
    }
    if (reviewStatus !== 'closed_no_action' || nexusDestination !== 'waste_register') {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] waste action packs must stay closed_no_action in waste_register`,
      );
    }
    return;
  }

  if (sourceReviewStatus === 'pending_review' && (actionType !== 'pending_review_hold' || reviewStatus !== 'pending_decision')) {
    throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}] pending_review candidates must remain pending_review_hold`);
  }

  if (actionType === 'memory_write_proposal') {
    if (candidateType !== 'memory' || sourceReviewStatus !== 'approved' || reviewStatus !== 'requires_human_review') {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] memory_write_proposal action packs must originate from approved memory candidates`,
      );
    }
    return;
  }

  if (actionType === 'task_draft_proposal') {
    if (candidateType !== 'task' || sourceReviewStatus !== 'approved' || reviewStatus !== 'requires_human_review') {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] task_draft_proposal action packs must originate from approved task candidates`,
      );
    }
    return;
  }

  if (actionType === 'future_review_proposal') {
    if (sourceReviewStatus !== 'approved' && sourceReviewStatus !== 'parked') {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] future_review_proposal action packs must originate from approved or parked candidates`,
      );
    }
    if (sourceReviewStatus === 'approved' && (candidateType === 'memory' || candidateType === 'task')) {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] approved memory/task candidates must not be future_review_proposal`,
      );
    }
    if (reviewStatus !== 'parked') {
      throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}] future_review_proposal action packs must stay parked`);
    }
    return;
  }

  if (actionType === 'evidence_only') {
    if (sourceReviewStatus !== 'rejected' || reviewStatus !== 'closed_no_action') {
      throw new Error(
        `Invalid Approval Dry-Run input: handoff.actionPacks[${index}] evidence_only action packs must originate from rejected non-waste candidates`,
      );
    }
    return;
  }

  if (actionType === 'pending_review_hold' && (sourceReviewStatus !== 'pending_review' || reviewStatus !== 'pending_decision')) {
    throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}] pending_review_hold action packs must stay pending_decision`);
  }
}

function validateActionPack(value: unknown, index: number): ApprovalHandoffActionPack {
  if (!isPlainObject(value)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}] must be an object`);
  requiredString(value.actionPackId, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].actionPackId is required`);
  requiredString(value.candidateId, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].candidateId is required`);
  const candidateType = requiredString(value.candidateType, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].candidateType is required`);
  if (!VALID_CANDIDATE_TYPES.has(candidateType)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].candidateType is invalid`);
  const sourceReviewStatus = requiredString(
    value.sourceReviewStatus,
    `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sourceReviewStatus is required`,
  );
  if (!VALID_SOURCE_REVIEW_STATUSES.has(sourceReviewStatus)) {
    throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sourceReviewStatus is invalid`);
  }
  const actionType = requiredString(value.actionType, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].actionType is required`);
  if (!VALID_ACTION_TYPES.has(actionType)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].actionType is invalid`);
  const reviewStatus = requiredString(value.reviewStatus, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].reviewStatus is required`);
  if (!VALID_REVIEW_STATUSES.has(reviewStatus)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].reviewStatus is invalid`);
  const nexusDestination = requiredString(value.nexusDestination, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].nexusDestination is required`);
  if (!VALID_NEXUS_DESTINATIONS.has(nexusDestination)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].nexusDestination is invalid`);
  requiredString(value.title, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].title is required`);
  requiredString(value.proposal, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].proposal is required`);
  requiredString(value.allowedDownstreamAction, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].allowedDownstreamAction is required`);
  if (!Array.isArray(value.prohibitedActions)) throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].prohibitedActions is required`);
  requiredString(value.verificationStep, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].verificationStep is required`);
  const sourceNotePath = requiredString(value.sourceNotePath, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sourceNotePath is required`);
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sourceNotePath`);
  const approvalLedgerPath = requiredString(value.approvalLedgerPath, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].approvalLedgerPath is required`);
  assertSafeRelativePath(approvalLedgerPath, SAFE_APPROVAL_LEDGER_PREFIX, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].approvalLedgerPath`);
  const sideEffectBoundary = requiredString(value.sideEffectBoundary, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sideEffectBoundary is required`);
  if (sideEffectBoundary !== 'proposal-only-no-execution') {
    throw new Error(`Invalid Approval Dry-Run input: handoff.actionPacks[${index}].sideEffectBoundary must be proposal-only-no-execution`);
  }
  validateActionPackConsistency(index, candidateType, sourceReviewStatus, actionType, reviewStatus, nexusDestination);
  requiredString(value.generatedAt, `Invalid Approval Dry-Run input: handoff.actionPacks[${index}].generatedAt is required`);
  return value as unknown as ApprovalHandoffActionPack;
}

function validateHandoff(value: unknown): ApprovalHandoff {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Dry-Run input: handoff is required');
  requiredString(value.generatedAt, 'Invalid Approval Dry-Run input: handoff.generatedAt is required');
  requiredString(value.preparedBy, 'Invalid Approval Dry-Run input: handoff.preparedBy is required');
  const approvalLedgerPath = requiredString(value.approvalLedgerPath, 'Invalid Approval Dry-Run input: handoff.approvalLedgerPath is required');
  assertSafeRelativePath(approvalLedgerPath, SAFE_APPROVAL_LEDGER_PREFIX, 'Invalid Approval Dry-Run input: handoff.approvalLedgerPath');
  const sourceRegisterPath = requiredString(value.sourceRegisterPath, 'Invalid Approval Dry-Run input: handoff.sourceRegisterPath is required');
  assertSafeRelativePath(sourceRegisterPath, SAFE_REGISTER_PREFIX, 'Invalid Approval Dry-Run input: handoff.sourceRegisterPath');
  const sourceNotePath = requiredString(value.sourceNotePath, 'Invalid Approval Dry-Run input: handoff.sourceNotePath is required');
  assertSafeRelativePath(sourceNotePath, SAFE_SOURCE_NOTE_PREFIX, 'Invalid Approval Dry-Run input: handoff.sourceNotePath');
  if (!Array.isArray(value.actionPacks)) throw new Error('Invalid Approval Dry-Run input: handoff.actionPacks is required');
  if (!Array.isArray(value.sideEffectBoundaries)) throw new Error('Invalid Approval Dry-Run input: handoff.sideEffectBoundaries is required');

  const seenActionPackIds = new Set<string>();
  value.actionPacks.forEach((pack, index) => {
    const validatedPack = validateActionPack(pack, index);
    if (seenActionPackIds.has(validatedPack.actionPackId)) {
      throw new Error(`Invalid Approval Dry-Run input: duplicate handoff actionPackId: ${validatedPack.actionPackId}`);
    }
    seenActionPackIds.add(validatedPack.actionPackId);
  });

  value.sideEffectBoundaries.forEach((boundary, index) => {
    if (typeof boundary !== 'string' || boundary.trim().length === 0) {
      throw new Error(`Invalid Approval Dry-Run input: handoff.sideEffectBoundaries[${index}] must be a string`);
    }
  });

  return value as unknown as ApprovalHandoff;
}

export function validateApprovalDryRunInput(value: unknown): ApprovalDryRunInput {
  if (!isPlainObject(value)) throw new Error('Invalid Approval Dry-Run input: expected object');
  const generatedAt = requiredString(value.generatedAt, 'Invalid Approval Dry-Run input: generatedAt is required');
  const approvalHandoffPath = requiredString(value.approvalHandoffPath, 'Invalid Approval Dry-Run input: approvalHandoffPath is required');
  const preparedBy = requiredString(value.preparedBy, 'Invalid Approval Dry-Run input: preparedBy is required');
  assertSafeRelativePath(approvalHandoffPath, SAFE_APPROVAL_HANDOFF_PREFIX, 'Invalid Approval Dry-Run input: approvalHandoffPath');
  const dryRunName = typeof value.dryRunName === 'string' && value.dryRunName.trim().length > 0 ? value.dryRunName : undefined;
  return { dryRunName, generatedAt, preparedBy, approvalHandoffPath, handoff: validateHandoff(value.handoff) };
}

function dryRunActionForPack(pack: ApprovalHandoffActionPack): ApprovalDryRunAction {
  if (pack.actionType === 'memory_write_proposal') return 'dry_run_memory_write_request';
  if (pack.actionType === 'task_draft_proposal') return 'dry_run_task_draft';
  if (pack.actionType === 'future_review_proposal') return 'dry_run_future_review_queue_item';
  if (pack.actionType === 'evidence_only') return 'dry_run_archive_evidence_marker';
  return 'dry_run_no_op_hold';
}

function wouldDoForAction(pack: ApprovalHandoffActionPack, dryRunAction: ApprovalDryRunAction): string {
  if (dryRunAction === 'dry_run_memory_write_request') {
    return `Would draft a separate durable-memory write request for human approval: ${pack.proposal}`;
  }
  if (dryRunAction === 'dry_run_task_draft') {
    return `Would draft a separate local task proposal for human approval: ${pack.proposal}`;
  }
  if (dryRunAction === 'dry_run_future_review_queue_item') {
    return `Would preserve as a future review queue item only: ${pack.proposal}`;
  }
  if (dryRunAction === 'dry_run_archive_evidence_marker') {
    return `Would mark as local archive/evidence only: ${pack.proposal}`;
  }
  return `Would hold as a no-op pending decision: ${pack.proposal}`;
}

function mustNotDoForAction(dryRunAction: ApprovalDryRunAction): string[] {
  const universal = [
    'Must not execute the dry-run item.',
    'Must not mutate external integrations, production data, deployments, or client-facing outputs.',
  ];
  if (dryRunAction === 'dry_run_memory_write_request') return ['Must not write durable memory.', 'Must not create tasks or experiments.', ...universal];
  if (dryRunAction === 'dry_run_task_draft') return ['Must not create or execute tasks.', 'Must not write durable memory.', ...universal];
  if (dryRunAction === 'dry_run_future_review_queue_item') return ['Must not create experiments or route work.', 'Must not publish output.', ...universal];
  if (dryRunAction === 'dry_run_archive_evidence_marker') return ['Must not operationalize evidence-only items.', 'Must not resurrect rejected/waste items without new explicit approval.', ...universal];
  return ['Must not create memory, tasks, experiments, routes, or production changes.', ...universal];
}

function dryRunItem(pack: ApprovalHandoffActionPack, input: ApprovalDryRunInput): ApprovalDryRunItem {
  const dryRunAction = dryRunActionForPack(pack);
  return {
    dryRunItemId: slugify(`${pack.actionPackId}-${dryRunAction}-${input.generatedAt}`),
    actionPackId: redactSensitiveText(pack.actionPackId),
    candidateId: redactSensitiveText(pack.candidateId),
    candidateType: pack.candidateType,
    sourceActionType: pack.actionType,
    sourceReviewStatus: pack.sourceReviewStatus,
    dryRunAction,
    executionStatus: 'not_executed',
    nexusDestination: pack.nexusDestination,
    title: redactSensitiveText(pack.title),
    wouldDo: redactSensitiveText(wouldDoForAction(pack, dryRunAction)),
    mustNotDo: mustNotDoForAction(dryRunAction),
    verificationStep: redactSensitiveText(pack.verificationStep),
    sourceNotePath: redactSensitiveText(pack.sourceNotePath),
    approvalLedgerPath: redactSensitiveText(pack.approvalLedgerPath),
    approvalHandoffPath: redactSensitiveText(input.approvalHandoffPath),
    sideEffectBoundary: 'dry-run-only-no-execution',
    generatedAt: input.generatedAt,
  };
}

export function buildApprovalDryRun(rawInput: ApprovalDryRunInput): ApprovalDryRun {
  const input = validateApprovalDryRunInput(rawInput);
  return {
    dryRunName: redactSensitiveText(input.dryRunName ?? 'approval-dry-run'),
    generatedAt: input.generatedAt,
    preparedBy: redactSensitiveText(input.preparedBy),
    approvalHandoffPath: redactSensitiveText(input.approvalHandoffPath),
    approvalLedgerPath: redactSensitiveText(input.handoff.approvalLedgerPath),
    sourceRegisterPath: redactSensitiveText(input.handoff.sourceRegisterPath),
    sourceNotePath: redactSensitiveText(input.handoff.sourceNotePath),
    dryRunItems: input.handoff.actionPacks.map((pack) => dryRunItem(pack, input)),
    sideEffectBoundaries: [
      'No durable memory writes occurred.',
      'No task creation, task execution, experiment creation, routing, external mutation, production writes, deployments, or client-facing actions occurred.',
      'Dry-run items describe what would happen next only and still require separate explicit human approval before any downstream side effect.',
      'Evidence-only, waste, rejected, parked, and pending items remain local non-executing dry-run state only.',
    ],
  };
}

export function renderApprovalDryRunMarkdown(dryRun: ApprovalDryRun): string {
  return [
    '# Personal Intelligence Approval Decision Applier Dry-Run',
    '',
    `Dry-run name: ${markdownCell(dryRun.dryRunName)}`,
    `Generated at: ${dryRun.generatedAt}`,
    `Prepared by: ${markdownCell(dryRun.preparedBy)}`,
    `Approval handoff: ${markdownCell(dryRun.approvalHandoffPath)}`,
    `Approval ledger: ${markdownCell(dryRun.approvalLedgerPath)}`,
    `Source register: ${markdownCell(dryRun.sourceRegisterPath)}`,
    `Source note: ${markdownCell(dryRun.sourceNotePath)}`,
    '',
    '## Dry-run next-step items',
    '',
    '| Dry-run item | Action pack | Candidate | Handoff action | Dry-run action | Execution status | Destination | Title | Would do |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...dryRun.dryRunItems.map(
      (item) =>
        `| ${markdownCell(item.dryRunItemId)} | ${markdownCell(item.actionPackId)} | ${markdownCell(item.candidateId)} | ${item.sourceActionType} | ${item.dryRunAction} | ${item.executionStatus} | ${item.nexusDestination} | ${markdownCell(item.title)} | ${markdownCell(item.wouldDo)} |`,
    ),
    '',
    '## Dry-run boundaries',
    '',
    'This artifact is a local dry-run only. It does not apply, create, write, execute, route, publish, deploy, or mutate anything.',
    ...dryRun.sideEffectBoundaries.map((boundary) => `- ${markdownCell(boundary)}`),
    '',
  ].join('\n');
}
