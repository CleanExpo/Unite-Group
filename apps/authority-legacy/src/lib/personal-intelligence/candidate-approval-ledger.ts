import { redactSensitiveText } from './redaction';
import type { CandidateRegisterBatch, CandidateRegisterEntry } from './candidate-register';

export type CandidateApprovalDecision = 'approved' | 'rejected' | 'parked';
export type CandidateApprovalCurrentStatus = CandidateApprovalDecision | 'pending_review';

export interface CandidateApprovalDecisionInput {
  candidateId: string;
  decision: CandidateApprovalDecision;
  decidedAt: string;
  decidedBy: string;
  rationale: string;
}

export interface CandidateApprovalLedgerInput {
  generatedAt: string;
  reviewer: string;
  registerPath: string;
  registerBatch: CandidateRegisterBatch;
  decisions: CandidateApprovalDecisionInput[];
}

export interface CandidateApprovalAuditEvent extends CandidateApprovalDecisionInput {
  eventId: string;
  immutable: true;
  sideEffectBoundary: 'local-ledger-only';
}

export interface CandidateApprovalStatusSnapshot {
  candidateId: string;
  candidateType: CandidateRegisterEntry['candidateType'];
  sourceApprovalStatus: CandidateRegisterEntry['approvalStatus'];
  currentStatus: CandidateApprovalCurrentStatus;
  nexusDestination: CandidateRegisterEntry['nexusDestination'];
  title: string;
  usefulSignal: string;
  allowedNextAction: string;
  verificationStep: string;
  sideEffectBoundary: 'no-execution';
  sourceNotePath: string;
  registerPath: string;
  updatedAt: string;
}

export interface CandidateApprovalLedger {
  generatedAt: string;
  reviewer: string;
  registerPath: string;
  sourceNotePath: string;
  currentStatuses: CandidateApprovalStatusSnapshot[];
  auditTrail: CandidateApprovalAuditEvent[];
  sideEffectBoundaries: string[];
}

const SAFE_REGISTER_PREFIX = 'docs/margot/personal-intelligence/candidate-register/';
const SAFE_SOURCE_NOTE_PREFIX = 'docs/margot/personal-intelligence/nexus-mapping-notes/';
const VALID_DECISIONS = new Set<CandidateApprovalDecision>(['approved', 'rejected', 'parked']);
const VALID_CANDIDATE_TYPES = new Set(['memory', 'task', 'waste', 'experiment']);
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

function markdownCell(value: string): string {
  return redactSensitiveText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function slugify(value: string): string {
  return redactSensitiveText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'candidate-approval-event';
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(message);
  return value;
}

function assertSafeSourceNotePath(value: string, messagePrefix: string): void {
  if (!value.startsWith(SAFE_SOURCE_NOTE_PREFIX) || value.includes('..')) {
    throw new Error(
      `Invalid Candidate Approval Ledger input: ${messagePrefix} must stay under ${SAFE_SOURCE_NOTE_PREFIX.replace(/\/$/, '')}`,
    );
  }
}

function validateRegisterBatch(value: unknown): CandidateRegisterBatch {
  if (!isPlainObject(value)) throw new Error('Invalid Candidate Approval Ledger input: registerBatch is required');
  requiredString(value.generatedAt, 'Invalid Candidate Approval Ledger input: registerBatch.generatedAt is required');
  const sourceNotePath = requiredString(value.sourceNotePath, 'Invalid Candidate Approval Ledger input: registerBatch.sourceNotePath is required');
  assertSafeSourceNotePath(sourceNotePath, 'registerBatch.sourceNotePath');
  if (!Array.isArray(value.entries)) throw new Error('Invalid Candidate Approval Ledger input: registerBatch.entries is required');

  const seenEntryCandidateIds = new Set<string>();
  value.entries.forEach((entry, index) => {
    if (!isPlainObject(entry)) throw new Error(`Invalid Candidate Approval Ledger input: registerBatch.entries[${index}] must be an object`);
    const entryCandidateId = requiredString(entry.candidateId, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].candidateId is required`);
    if (seenEntryCandidateIds.has(entryCandidateId)) {
      throw new Error(`Invalid Candidate Approval Ledger input: duplicate registerBatch entry candidateId: ${entryCandidateId}`);
    }
    seenEntryCandidateIds.add(entryCandidateId);
    const candidateType = requiredString(entry.candidateType, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].candidateType is required`);
    if (!VALID_CANDIDATE_TYPES.has(candidateType)) {
      throw new Error(`Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].candidateType must be memory, task, waste, or experiment`);
    }
    const approvalStatus = requiredString(entry.approvalStatus, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].approvalStatus is required`);
    if (!VALID_SOURCE_APPROVAL_STATUSES.has(approvalStatus)) {
      throw new Error(
        `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].approvalStatus must be draft, needs_approval, approved, or rejected`,
      );
    }
    const nexusDestination = requiredString(entry.nexusDestination, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].nexusDestination is required`);
    if (!VALID_NEXUS_DESTINATIONS.has(nexusDestination)) {
      throw new Error(`Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].nexusDestination is not a known Nexus destination`);
    }
    requiredString(entry.title, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].title is required`);
    requiredString(entry.usefulSignal, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].usefulSignal is required`);
    requiredString(entry.smallestNextAction, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].smallestNextAction is required`);
    requiredString(entry.verificationStep, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].verificationStep is required`);
    const entrySourceNotePath = requiredString(entry.sourceNotePath, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].sourceNotePath is required`);
    assertSafeSourceNotePath(entrySourceNotePath, `registerBatch.entries[${index}].sourceNotePath`);
    requiredString(entry.createdAt, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].createdAt is required`);
    requiredString(entry.updatedAt, `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].updatedAt is required`);
    if (!Array.isArray(entry.retentionPrivacyGuardrails)) {
      throw new Error(`Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].retentionPrivacyGuardrails is required`);
    }
    entry.retentionPrivacyGuardrails.forEach((guardrail, guardrailIndex) => {
      if (typeof guardrail !== 'string' || guardrail.trim().length === 0) {
        throw new Error(
          `Invalid Candidate Approval Ledger input: registerBatch.entries[${index}].retentionPrivacyGuardrails[${guardrailIndex}] must be a string`,
        );
      }
    });
  });

  return value as unknown as CandidateRegisterBatch;
}

export function validateCandidateApprovalLedgerInput(value: unknown): CandidateApprovalLedgerInput {
  if (!isPlainObject(value)) throw new Error('Invalid Candidate Approval Ledger input: expected object');
  const generatedAt = requiredString(value.generatedAt, 'Invalid Candidate Approval Ledger input: generatedAt is required');
  const registerPath = requiredString(value.registerPath, 'Invalid Candidate Approval Ledger input: registerPath is required');
  const reviewer = requiredString(value.reviewer, 'Invalid Candidate Approval Ledger input: reviewer is required');
  if (!registerPath.startsWith(SAFE_REGISTER_PREFIX) || registerPath.includes('..')) {
    throw new Error(
      `Invalid Candidate Approval Ledger input: registerPath must stay under ${SAFE_REGISTER_PREFIX.replace(/\/$/, '')}`,
    );
  }

  const registerBatch = validateRegisterBatch(value.registerBatch);
  if (!Array.isArray(value.decisions)) throw new Error('Invalid Candidate Approval Ledger input: decisions is required');
  const seenDecisionCandidateIds = new Set<string>();
  const decisions = value.decisions.map((decision, index): CandidateApprovalDecisionInput => {
    if (!isPlainObject(decision)) throw new Error(`Invalid Candidate Approval Ledger input: decisions[${index}] must be an object`);
    const candidateId = requiredString(decision.candidateId, `Invalid Candidate Approval Ledger input: decisions[${index}].candidateId is required`);
    if (seenDecisionCandidateIds.has(candidateId)) {
      throw new Error(`Invalid Candidate Approval Ledger input: duplicate decision for candidateId: ${candidateId}`);
    }
    seenDecisionCandidateIds.add(candidateId);
    const rawDecision = requiredString(decision.decision, `Invalid Candidate Approval Ledger input: decisions[${index}].decision is required`);
    if (!VALID_DECISIONS.has(rawDecision as CandidateApprovalDecision)) {
      throw new Error(`Invalid Candidate Approval Ledger input: decisions[${index}].decision must be approved, rejected, or parked`);
    }
    const decidedAt = requiredString(decision.decidedAt, `Invalid Candidate Approval Ledger input: decisions[${index}].decidedAt is required`);
    const decidedBy = requiredString(decision.decidedBy, `Invalid Candidate Approval Ledger input: decisions[${index}].decidedBy is required`);
    const rationale = requiredString(decision.rationale, `Invalid Candidate Approval Ledger input: decisions[${index}].rationale is required`);
    return { candidateId, decision: rawDecision as CandidateApprovalDecision, decidedAt, decidedBy, rationale };
  });

  return { generatedAt, reviewer, registerPath, registerBatch, decisions };
}

function allowedNextAction(status: CandidateApprovalCurrentStatus, candidateType: CandidateRegisterEntry['candidateType']): string {
  if (status === 'approved' && candidateType === 'memory') {
    return 'Eligible for a separate explicit durable-memory write approval; this ledger does not write memory.';
  }
  if (status === 'approved' && candidateType === 'task') {
    return 'Eligible for a separate implementation plan; this ledger does not execute tasks.';
  }
  if (status === 'approved') {
    return 'Eligible for separate local planning only; this ledger does not deploy, publish, or write production data.';
  }
  if (status === 'rejected') return 'Retain as rejected evidence only; do not operationalize.';
  if (status === 'parked') return 'Keep parked for later review; do not execute or route.';
  return 'Do not execute, store, route, or deploy until an explicit ledger decision is recorded.';
}

function auditEvent(decision: CandidateApprovalDecisionInput): CandidateApprovalAuditEvent {
  return {
    eventId: slugify(`${decision.candidateId}-${decision.decision}-${decision.decidedAt}`),
    candidateId: redactSensitiveText(decision.candidateId),
    decision: decision.decision,
    decidedAt: decision.decidedAt,
    decidedBy: redactSensitiveText(decision.decidedBy),
    rationale: redactSensitiveText(decision.rationale),
    immutable: true,
    sideEffectBoundary: 'local-ledger-only',
  };
}

export function buildCandidateApprovalLedger(rawInput: CandidateApprovalLedgerInput): CandidateApprovalLedger {
  const input = validateCandidateApprovalLedgerInput(rawInput);
  const entriesById = new Map(input.registerBatch.entries.map((entry) => [entry.candidateId, entry]));
  const latestDecisionById = new Map<string, CandidateApprovalDecisionInput>();

  input.decisions.forEach((decision) => {
    if (!entriesById.has(decision.candidateId)) {
      throw new Error(`Invalid Candidate Approval Ledger input: decision references unknown candidateId: ${decision.candidateId}`);
    }
    latestDecisionById.set(decision.candidateId, decision);
  });

  return {
    generatedAt: input.generatedAt,
    reviewer: redactSensitiveText(input.reviewer),
    registerPath: redactSensitiveText(input.registerPath),
    sourceNotePath: redactSensitiveText(input.registerBatch.sourceNotePath),
    currentStatuses: input.registerBatch.entries.map((entry): CandidateApprovalStatusSnapshot => {
      const decision = latestDecisionById.get(entry.candidateId);
      const currentStatus = decision?.decision ?? 'pending_review';
      return {
        candidateId: redactSensitiveText(entry.candidateId),
        candidateType: entry.candidateType,
        sourceApprovalStatus: entry.approvalStatus,
        currentStatus,
        nexusDestination: entry.nexusDestination,
        title: redactSensitiveText(entry.title),
        usefulSignal: redactSensitiveText(entry.usefulSignal),
        allowedNextAction: allowedNextAction(currentStatus, entry.candidateType),
        verificationStep: redactSensitiveText(entry.verificationStep),
        sideEffectBoundary: 'no-execution',
        sourceNotePath: redactSensitiveText(entry.sourceNotePath),
        registerPath: redactSensitiveText(input.registerPath),
        updatedAt: decision?.decidedAt ?? input.generatedAt,
      };
    }),
    auditTrail: input.decisions.map(auditEvent),
    sideEffectBoundaries: [
      'No durable memory writes occurred.',
      'No task execution occurred.',
      'No production database writes occurred.',
      'No deployment, publishing, or client-facing action occurred.',
      'Ledger is local evidence state only and requires separate explicit approval for any downstream side effect.',
    ],
  };
}

export function renderCandidateApprovalLedgerMarkdown(ledger: CandidateApprovalLedger): string {
  return [
    '# Personal Intelligence Candidate Approval Ledger',
    '',
    `Generated at: ${ledger.generatedAt}`,
    `Reviewer: ${markdownCell(ledger.reviewer)}`,
    `Register: ${markdownCell(ledger.registerPath)}`,
    `Source note: ${markdownCell(ledger.sourceNotePath)}`,
    '',
    '## Current review queue',
    '',
    '| Candidate | Type | Source status | Current status | Destination | Title | Allowed next action |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...ledger.currentStatuses.map(
      (status) =>
        `| ${markdownCell(status.candidateId)} | ${status.candidateType} | ${status.sourceApprovalStatus} | ${status.currentStatus} | ${status.nexusDestination} | ${markdownCell(status.title)} | ${markdownCell(status.allowedNextAction)} |`,
    ),
    '',
    '## Immutable local audit trail',
    '',
    '| Event | Candidate | Decision | Decided at | Decided by | Rationale | Boundary |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...ledger.auditTrail.map(
      (event) =>
        `| ${markdownCell(event.eventId)} | ${markdownCell(event.candidateId)} | ${event.decision} | ${event.decidedAt} | ${markdownCell(event.decidedBy)} | ${markdownCell(event.rationale)} | ${event.sideEffectBoundary} |`,
    ),
    ledger.auditTrail.length === 0 ? '| none | none | pending_review | n/a | n/a | No decisions recorded yet. | local-ledger-only |' : '',
    '',
    '## Side-effect boundaries',
    '',
    'No durable memory writes, task execution, production writes, deployment, or client-facing action occurred.',
    ...ledger.sideEffectBoundaries.map((boundary) => `- ${markdownCell(boundary)}`),
    '',
  ].join('\n');
}
