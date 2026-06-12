import { validateNexusMappingNoteInput } from './nexus-mapping-note';
import { redactSensitiveText } from './redaction';
import type { NexusMapping, PersonalIntelligenceClassification } from './types';

export type CandidateRegisterType = 'memory' | 'task' | 'waste' | 'experiment';
export type CandidateRegisterApprovalStatus = 'draft' | 'needs_approval' | 'approved' | 'rejected';

export interface CandidateRegisterPromotionInput {
  generatedAt: string;
  sourceNotePath: string;
  classification: PersonalIntelligenceClassification;
}

export interface CandidateRegisterEntry {
  candidateId: string;
  sourceNotePath: string;
  candidateType: CandidateRegisterType;
  approvalStatus: CandidateRegisterApprovalStatus;
  nexusDestination: NexusMapping;
  title: string;
  usefulSignal: string;
  smallestNextAction: string;
  verificationStep: string;
  retentionPrivacyGuardrails: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateRegisterBatch {
  generatedAt: string;
  sourceNotePath: string;
  entries: CandidateRegisterEntry[];
}

const SAFE_SOURCE_NOTE_PREFIX = 'docs/margot/personal-intelligence/nexus-mapping-notes/';
const WASTE_LABELS = new Set(['duplicate', 'hype', 'entertainment', 'off-strategy', 'low-confidence', 'reject']);
const OPERATIONAL_BLOCKED_FOR_WASTE = new Set<NexusMapping>([
  'crm',
  'client_2nd_brain',
  'marketing_strategy',
  'ai_enhancement_pipeline',
  'agentic_thinking',
  'product_roadmap',
  'project_portfolio',
  'memory_candidate',
  'task_candidate',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  return redactSensitiveText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'personal-intelligence';
}

export function candidateRegisterOutputBaseName(sourceNotePath: string): string {
  const basename = sourceNotePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'candidate-register';
  return slugify(redactSensitiveText(basename));
}

function sourceSlug(classification: PersonalIntelligenceClassification): string {
  const id = classification.id?.match(/[?&]v=([^&]+)/)?.[1] ?? classification.id?.split(':').pop() ?? classification.title;
  return slugify(
    id
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/(phase)(\d+)([a-z])/i, '$1-$2$3'),
  );
}

function isWaste(classification: PersonalIntelligenceClassification): boolean {
  return WASTE_LABELS.has(classification.wasteLabel);
}

function approvalRequired(classification: PersonalIntelligenceClassification): boolean {
  return (
    classification.approvalRequiredBeforeStorage ||
    classification.privacyClass !== 'public' ||
    classification.memoryCandidates.some((candidate) => candidate.approvalRequired) ||
    classification.taskCandidates.some((candidate) => candidate.approvalRequired)
  );
}

function entryApprovalStatus(classification: PersonalIntelligenceClassification, candidateApprovalRequired = false): CandidateRegisterApprovalStatus {
  return classification.approvalRequiredBeforeStorage || classification.privacyClass !== 'public' || candidateApprovalRequired
    ? 'needs_approval'
    : 'draft';
}

function experimentApprovalStatus(classification: PersonalIntelligenceClassification): CandidateRegisterApprovalStatus {
  return approvalRequired(classification) ? 'needs_approval' : 'draft';
}

function firstOperationalDestination(classification: PersonalIntelligenceClassification): NexusMapping {
  if (isWaste(classification)) return 'waste_register';
  return classification.nexusMappings.find((mapping) => mapping !== 'waste_register') ?? 'parked_research';
}

function sanitizedSummary(classification: PersonalIntelligenceClassification): string {
  return redactSensitiveText(classification.summary);
}

function markdownCell(value: string): string {
  return redactSensitiveText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function createdEntry(
  input: CandidateRegisterPromotionInput,
  entry: Omit<CandidateRegisterEntry, 'sourceNotePath' | 'createdAt' | 'updatedAt'>,
): CandidateRegisterEntry {
  return {
    ...entry,
    sourceNotePath: redactSensitiveText(input.sourceNotePath),
    title: redactSensitiveText(entry.title),
    usefulSignal: redactSensitiveText(entry.usefulSignal),
    smallestNextAction: redactSensitiveText(entry.smallestNextAction),
    verificationStep: redactSensitiveText(entry.verificationStep),
    retentionPrivacyGuardrails: entry.retentionPrivacyGuardrails.map((guardrail) => redactSensitiveText(guardrail)),
    createdAt: input.generatedAt,
    updatedAt: input.generatedAt,
  };
}

export function validateCandidateRegisterPromotionInput(value: unknown): CandidateRegisterPromotionInput {
  if (!isPlainObject(value)) throw new Error('Invalid Candidate Register promotion input: expected object');
  if (typeof value.generatedAt !== 'string' || value.generatedAt.trim().length === 0) {
    throw new Error('Invalid Candidate Register promotion input: generatedAt is required');
  }
  if (typeof value.sourceNotePath !== 'string' || value.sourceNotePath.trim().length === 0) {
    throw new Error('Invalid Candidate Register promotion input: sourceNotePath is required');
  }
  if (!value.sourceNotePath.startsWith(SAFE_SOURCE_NOTE_PREFIX) || value.sourceNotePath.includes('..')) {
    throw new Error(
      `Invalid Candidate Register promotion input: sourceNotePath must stay under ${SAFE_SOURCE_NOTE_PREFIX.replace(/\/$/, '')}`,
    );
  }

  if (!isPlainObject(value.classification)) {
    throw new Error('Invalid Candidate Register promotion input: classification is required');
  }
  const classification = value.classification;
  if (classification.id !== undefined && typeof classification.id !== 'string') {
    throw new Error('Invalid Candidate Register promotion input: classification.id must be a string when supplied');
  }
  if (classification.sourceUrl !== undefined && typeof classification.sourceUrl !== 'string') {
    throw new Error('Invalid Candidate Register promotion input: classification.sourceUrl must be a string when supplied');
  }
  if (classification.creatorOrAuthor !== undefined && typeof classification.creatorOrAuthor !== 'string') {
    throw new Error('Invalid Candidate Register promotion input: classification.creatorOrAuthor must be a string when supplied');
  }
  if (classification.rawTranscriptStored !== false) {
    throw new Error('Invalid Candidate Register promotion input: classification.rawTranscriptStored must be false');
  }

  const noteInput = validateNexusMappingNoteInput({
    noteName: 'candidate-register-validation',
    generatedAt: value.generatedAt,
    classification: value.classification,
  });

  return {
    generatedAt: value.generatedAt,
    sourceNotePath: value.sourceNotePath,
    classification: noteInput.classification,
  };
}

export function buildCandidateRegisterBatch(rawInput: CandidateRegisterPromotionInput): CandidateRegisterBatch {
  const input = validateCandidateRegisterPromotionInput(rawInput);
  const classification = input.classification;
  const baseSlug = sourceSlug(classification);
  const entries: CandidateRegisterEntry[] = [];

  if (isWaste(classification)) {
    entries.push(
      createdEntry(input, {
        candidateId: `${baseSlug}-waste-1`,
        candidateType: 'waste',
        approvalStatus: 'rejected',
        nexusDestination: 'waste_register',
        title: `Waste-register evidence: ${classification.title}`,
        usefulSignal: sanitizedSummary(classification),
        smallestNextAction: 'Retain only as waste-register evidence; do not operationalize.',
        verificationStep: 'Read back the source note and confirm no operational Nexus destination is used.',
        retentionPrivacyGuardrails: [
          'Do not create memory, task, CRM, marketing, or agentic-thinking work from waste-like content.',
          'Keep only the distilled waste decision and source note path; do not store raw private content.',
          classification.nexusMappings.some((mapping) => OPERATIONAL_BLOCKED_FOR_WASTE.has(mapping))
            ? 'Operational destination mappings were suppressed.'
            : 'No operational destination mappings were present.',
        ],
      }),
    );

    return {
      generatedAt: input.generatedAt,
      sourceNotePath: redactSensitiveText(input.sourceNotePath),
      entries,
    };
  }

  classification.memoryCandidates.forEach((candidate, index) => {
    entries.push(
      createdEntry(input, {
        candidateId: `${baseSlug}-memory-${index + 1}`,
        candidateType: 'memory',
        approvalStatus: entryApprovalStatus(classification, candidate.approvalRequired),
        nexusDestination: 'memory_candidate',
        title: `Memory proposal: ${candidate.memoryType}`,
        usefulSignal: candidate.proposedMemory,
        smallestNextAction: 'Review and explicitly approve or reject this memory proposal before durable storage.',
        verificationStep: 'Confirm the memory is distilled, durable, non-raw, and explicitly approved before saving.',
        retentionPrivacyGuardrails: [
          'proposal only',
          'Memory candidate is a proposal only; do not write durable memory from this register.',
          `Durability reason: ${candidate.durabilityReason}`,
          'Reject or rewrite if it contains raw transcript, private search, credential, billing, or client-sensitive content.',
        ],
      }),
    );
  });

  classification.taskCandidates.forEach((candidate, index) => {
    entries.push(
      createdEntry(input, {
        candidateId: `${baseSlug}-task-${index + 1}`,
        candidateType: 'task',
        approvalStatus: entryApprovalStatus(classification, candidate.approvalRequired),
        nexusDestination: 'task_candidate',
        title: candidate.title,
        usefulSignal: sanitizedSummary(classification),
        smallestNextAction: candidate.smallestNextAction,
        verificationStep: candidate.verification,
        retentionPrivacyGuardrails: [
          'Task candidate is local draft decision support only; do not execute without a separate implementation plan and approval gate where required.',
          `Lane: ${candidate.lane}`,
          `Source privacy class: ${classification.privacyClass}`,
        ],
      }),
    );
  });

  entries.push(
    createdEntry(input, {
      candidateId: `${baseSlug}-experiment-1`,
      candidateType: 'experiment',
      approvalStatus: experimentApprovalStatus(classification),
      nexusDestination: firstOperationalDestination(classification),
      title: `Local Nexus experiment: ${classification.title}`,
      usefulSignal: sanitizedSummary(classification),
      smallestNextAction: `Create one local ${firstOperationalDestination(
        classification,
      )} draft experiment from the distilled signal; do not deploy or publish it.`,
      verificationStep: 'Read back the draft and confirm source, useful signal, waste decision, and approval state.',
      retentionPrivacyGuardrails: [
        'Local draft experiment only; no production writes, client-facing actions, publishing, or durable memory writes.',
        'Use distilled summary and source note path only; do not store raw transcripts, private notes, or source exports.',
        approvalRequired(classification)
          ? 'Approval required before storage, routing, or task execution.'
          : 'Public/non-sensitive signal may be drafted locally but still needs verification before execution.',
      ],
    }),
  );

  return {
    generatedAt: input.generatedAt,
    sourceNotePath: redactSensitiveText(input.sourceNotePath),
    entries,
  };
}

export function renderCandidateRegisterMarkdown(batch: CandidateRegisterBatch): string {
  const lines = [
    '# Personal Intelligence Candidate Register Batch',
    '',
    `Generated at: ${redactSensitiveText(batch.generatedAt)}`,
    `Source note path: ${redactSensitiveText(batch.sourceNotePath)}`,
    `Candidate count: ${batch.entries.length}`,
    '',
    '| Candidate id | Type | Approval status | Nexus destination | Title | Smallest next action | Verification |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...batch.entries.map(
      (entry) =>
        `| ${markdownCell(entry.candidateId)} | ${entry.candidateType} | ${entry.approvalStatus} | ${entry.nexusDestination} | ${markdownCell(entry.title)} | ${markdownCell(entry.smallestNextAction)} | ${markdownCell(entry.verificationStep)} |`,
    ),
    '',
    '## Retention and privacy guardrails',
    '',
    ...batch.entries.flatMap((entry) => [
      `### ${entry.candidateId}`,
      '',
      ...entry.retentionPrivacyGuardrails.map((guardrail) => `- ${guardrail}`),
      '',
    ]),
  ];

  return `${lines.join('\n').trim()}\n`;
}
