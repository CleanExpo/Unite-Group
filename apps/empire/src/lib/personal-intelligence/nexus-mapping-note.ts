import { redactSensitiveText } from './redaction';
import type { ContentSourceType, NexusMapping, PersonalIntelligenceClassification, PrivacyClass, WasteLabel } from './types';

export interface NexusMappingNoteInput {
  noteName: string;
  generatedAt: string;
  classification: PersonalIntelligenceClassification;
}

export interface NexusMappingNote {
  slug: string;
  generatedAt: string;
  sourceTitle: string;
  destination: NexusMapping;
  approvalRequired: boolean;
  usefulSignal: string;
  experiment: string;
  risk: string;
  verification: string;
  markdown: string;
}

const WASTE_LABELS = new Set<WasteLabel>([
  'useful',
  'mixed',
  'duplicate',
  'hype',
  'entertainment',
  'off-strategy',
  'low-confidence',
  'parked',
  'reject',
]);

const SOURCE_TYPES = new Set<ContentSourceType>([
  'youtube',
  'podcast',
  'audiobook',
  'search',
  'article',
  'newsletter',
  'voice',
  'chat',
  'export',
  'manual',
]);

const PRIVACY_CLASSES = new Set<PrivacyClass>(['public', 'personal', 'client', 'sensitive']);

const NEXUS_MAPPINGS = new Set<NexusMapping>([
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

const WASTE_RATIOS = new Set(['low', 'medium', 'high']);

const TOPIC_TAGS = new Set([
  'ai_models',
  'ai_agents',
  'agentic_thinking',
  'seo',
  'geo',
  'aeo',
  'content_strategy',
  'crm_sales',
  'saas_platform',
  'operations_delivery',
  'automation_integration',
  'finance_business_model',
  'leadership_founder',
  'client_service',
  'security_privacy',
  'entertainment_personal',
]);

const MEMORY_TYPES = new Set(['user_preference', 'business_thesis', 'operating_rule', 'project_convention']);
const TASK_LANES = new Set(['docs', 'research', 'implementation', 'test', 'marketing', 'crm', 'product', 'automation']);
const RELEVANCE_SCORE_KEYS = ['revenue', 'operating', 'data', 'client', 'strategic', 'actionability', 'confidence', 'total'] as const;

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

function yesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

function sanitizeOptional(value: string | undefined): string | undefined {
  return value === undefined ? undefined : redactSensitiveText(value);
}

function slugify(value: string): string {
  return redactSensitiveText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'nexus-mapping-note';
}

function isWaste(classification: PersonalIntelligenceClassification): boolean {
  return ['duplicate', 'hype', 'entertainment', 'off-strategy', 'low-confidence', 'reject'].includes(classification.wasteLabel);
}

function firstDestination(classification: PersonalIntelligenceClassification): NexusMapping {
  if (isWaste(classification)) return 'waste_register';
  const nonWaste = classification.nexusMappings.find((mapping) => mapping !== 'waste_register');
  return nonWaste ?? 'waste_register';
}

function buildExperiment(classification: PersonalIntelligenceClassification, destination: NexusMapping): string {
  if (destination === 'waste_register' || isWaste(classification)) {
    return 'No experiment — retain as waste-register evidence only.';
  }

  return `Nexus mapping experiment: create one local ${destination} draft applying this signal, then verify it with a small test or read-back before any production action.`;
}

function buildRisk(classification: PersonalIntelligenceClassification, approvalRequired: boolean): string {
  if (isWaste(classification)) return 'Accidentally operationalizing waste, hype, downtime, or duplicate content as strategic work.';
  if (approvalRequired) return 'Using approval-gated personal/client/sensitive signal, memory candidates, or task candidates before Phill explicitly approves storage, routing, or task execution.';
  return 'Do not convert this into production work without a separate implementation plan, test gate, and approval if required.';
}

function buildVerification(destination: NexusMapping): string {
  if (destination === 'waste_register') return 'Read back this note and confirm it is retained only as waste-register evidence.';
  return 'Read back this note and confirm it names the source, useful signal, waste decision, Nexus destination, one experiment, one risk, and one verification step.';
}

function renderCandidateLines(classification: PersonalIntelligenceClassification): string[] {
  const lines: string[] = [];

  if (classification.memoryCandidates.length > 0) {
    lines.push('## Draft memory candidate', '');
    classification.memoryCandidates.forEach((candidate, index) => {
      lines.push(
        `${index + 1}. ${redactSensitiveText(candidate.proposedMemory)} Approval required: ${yesNo(candidate.approvalRequired)}`,
      );
    });
    lines.push('');
  }

  if (classification.taskCandidates.length > 0) {
    lines.push('## Draft task candidate', '');
    classification.taskCandidates.forEach((candidate, index) => {
      lines.push(
        `${index + 1}. ${redactSensitiveText(candidate.title)} — ${redactSensitiveText(candidate.smallestNextAction)} Approval required: ${yesNo(candidate.approvalRequired)}`,
      );
    });
    lines.push('');
  }

  return lines;
}

function renderMarkdown(input: NexusMappingNoteInput, note: Omit<NexusMappingNote, 'markdown'>, classification: PersonalIntelligenceClassification): string {
  const sourceUrl = sanitizeOptional(classification.sourceUrl) ?? 'none';
  const sourceId = sanitizeOptional(classification.id) ?? 'none';
  const creator = sanitizeOptional(classification.creatorOrAuthor) ?? 'none';
  const whyItMatters = redactSensitiveText(classification.insights[0]?.whyItMatters ?? 'No why-it-matters rationale supplied.');
  const approvalGateLines = note.approvalRequired
    ? [
        '## Approval gate',
        '',
        'Do not store raw/source data or execute task candidates until approved.',
        '',
      ]
    : [];

  const lines = [
    `# Nexus Mapping Note: ${note.slug}`,
    '',
    `Generated at: ${input.generatedAt}`,
    `Approval required: ${yesNo(note.approvalRequired)}`,
    '',
    '## Source',
    '',
    `Source title: ${note.sourceTitle}`,
    `Source type: ${classification.sourceType}`,
    `Source id: ${sourceId}`,
    `Source URL: ${sourceUrl}`,
    `Creator/author: ${creator}`,
    `Privacy class: ${classification.privacyClass}`,
    '',
    '## Useful signal',
    '',
    note.usefulSignal,
    '',
    '## Why it matters',
    '',
    whyItMatters,
    '',
    '## Routing decision',
    '',
    `Waste decision: ${classification.wasteLabel} / ${classification.wasteRatio}`,
    `Nexus destination: ${note.destination}`,
    `All Nexus mappings: ${listOrNone(classification.nexusMappings)}`,
    `Topic tags: ${listOrNone(classification.topicTags)}`,
    `Relevance total: ${classification.relevanceScores.total}`,
    '',
    '## One experiment',
    '',
    note.experiment,
    '',
    '## One risk',
    '',
    note.risk,
    '',
    '## One verification step',
    '',
    note.verification,
    '',
    ...renderCandidateLines(classification),
    ...approvalGateLines,
    '## Retention guardrails',
    '',
    '- Local draft only.',
    '- Store distilled insight only; do not store raw transcripts, private notes, or source exports by default.',
    '- Memory candidates remain proposals until explicitly approved.',
    '',
  ];

  return `${lines.join('\n').trim()}\n`;
}

export function validateNexusMappingNoteInput(value: unknown): NexusMappingNoteInput {
  if (!isPlainObject(value)) throw new Error('Invalid Nexus Mapping Note input: expected object');
  if (typeof value.noteName !== 'string' || value.noteName.trim().length === 0) {
    throw new Error('Invalid Nexus Mapping Note input: noteName is required');
  }
  if (typeof value.generatedAt !== 'string' || !isIsoTimestamp(value.generatedAt)) {
    throw new Error('Invalid Nexus Mapping Note input: generatedAt must be an ISO timestamp');
  }
  if (!isPlainObject(value.classification)) {
    throw new Error('Invalid Nexus Mapping Note input: classification is required');
  }
  const classification = value.classification;
  if (typeof classification.wasteLabel !== 'string' || !WASTE_LABELS.has(classification.wasteLabel as WasteLabel)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.wasteLabel must be supported');
  }
  if (typeof classification.sourceType !== 'string' || !SOURCE_TYPES.has(classification.sourceType as ContentSourceType)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.sourceType must be supported');
  }
  if (typeof classification.title !== 'string' || classification.title.trim().length === 0) {
    throw new Error('Invalid Nexus Mapping Note input: classification.title is required');
  }
  if (typeof classification.summary !== 'string' || classification.summary.trim().length === 0) {
    throw new Error('Invalid Nexus Mapping Note input: classification.summary is required');
  }
  if (typeof classification.privacyClass !== 'string' || !PRIVACY_CLASSES.has(classification.privacyClass as PrivacyClass)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.privacyClass must be supported');
  }
  if (typeof classification.wasteRatio !== 'string' || !WASTE_RATIOS.has(classification.wasteRatio)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.wasteRatio must be low, medium, or high');
  }
  if (typeof classification.approvalRequiredBeforeStorage !== 'boolean') {
    throw new Error('Invalid Nexus Mapping Note input: classification.approvalRequiredBeforeStorage must be a boolean');
  }
  if (classification.rawTranscriptStored !== false) {
    throw new Error('Invalid Nexus Mapping Note input: classification.rawTranscriptStored must be false');
  }
  if (!Array.isArray(classification.nexusMappings)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.nexusMappings must be an array');
  }
  if (!classification.nexusMappings.every((mapping) => typeof mapping === 'string' && NEXUS_MAPPINGS.has(mapping as NexusMapping))) {
    throw new Error('Invalid Nexus Mapping Note input: classification.nexusMappings must contain supported mappings');
  }
  if (!Array.isArray(classification.topicTags)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.topicTags must be an array');
  }
  if (!classification.topicTags.every((topic) => typeof topic === 'string' && TOPIC_TAGS.has(topic))) {
    throw new Error('Invalid Nexus Mapping Note input: classification.topicTags must contain supported tags');
  }
  if (!isPlainObject(classification.relevanceScores)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.relevanceScores must be an object');
  }
  const relevanceScores = classification.relevanceScores;
  const missingRelevanceKey = RELEVANCE_SCORE_KEYS.find((key) => typeof relevanceScores[key] !== 'number');
  if (missingRelevanceKey) {
    throw new Error('Invalid Nexus Mapping Note input: classification.relevanceScores.total must be a number');
  }
  if (!Array.isArray(classification.insights)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.insights must be an array');
  }
  classification.insights.forEach((insight, index) => {
    if (!isPlainObject(insight) || typeof insight.claim !== 'string' || typeof insight.whyItMatters !== 'string') {
      throw new Error(`Invalid Nexus Mapping Note input: classification.insights[${index}] must include claim and whyItMatters`);
    }
    if (!Array.isArray(insight.nexusMappings)) {
      throw new Error(`Invalid Nexus Mapping Note input: classification.insights[${index}].nexusMappings must be an array`);
    }
  });
  if (!Array.isArray(classification.memoryCandidates)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.memoryCandidates must be an array');
  }
  classification.memoryCandidates.forEach((candidate, index) => {
    if (
      !isPlainObject(candidate) ||
      typeof candidate.proposedMemory !== 'string' ||
      typeof candidate.memoryType !== 'string' ||
      !MEMORY_TYPES.has(candidate.memoryType) ||
      typeof candidate.durabilityReason !== 'string' ||
      typeof candidate.approvalRequired !== 'boolean'
    ) {
      throw new Error(`Invalid Nexus Mapping Note input: classification.memoryCandidates[${index}] must include proposedMemory, memoryType, durabilityReason, and approvalRequired`);
    }
  });
  if (!Array.isArray(classification.taskCandidates)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.taskCandidates must be an array');
  }
  classification.taskCandidates.forEach((candidate, index) => {
    if (
      !isPlainObject(candidate) ||
      typeof candidate.title !== 'string' ||
      typeof candidate.lane !== 'string' ||
      !TASK_LANES.has(candidate.lane) ||
      typeof candidate.smallestNextAction !== 'string' ||
      typeof candidate.verification !== 'string' ||
      typeof candidate.approvalRequired !== 'boolean'
    ) {
      throw new Error(`Invalid Nexus Mapping Note input: classification.taskCandidates[${index}] must include title, lane, smallestNextAction, verification, and approvalRequired`);
    }
  });
  if (!Array.isArray(classification.operatorNotes)) {
    throw new Error('Invalid Nexus Mapping Note input: classification.operatorNotes must be an array');
  }
  if (!classification.operatorNotes.every((note) => typeof note === 'string')) {
    throw new Error('Invalid Nexus Mapping Note input: classification.operatorNotes must contain strings');
  }

  return value as unknown as NexusMappingNoteInput;
}

export function buildNexusMappingNote(input: NexusMappingNoteInput): NexusMappingNote {
  const validatedInput = validateNexusMappingNoteInput(input);
  const classification = validatedInput.classification;
  const destination = firstDestination(classification);
  const approvalRequired = classification.approvalRequiredBeforeStorage ||
    classification.privacyClass !== 'public' ||
    classification.memoryCandidates.some((candidate) => candidate.approvalRequired) ||
    classification.taskCandidates.some((candidate) => candidate.approvalRequired);
  const sourceTitle = redactSensitiveText(classification.title);
  const usefulSignal = redactSensitiveText(classification.insights[0]?.claim ?? classification.summary);
  const experiment = buildExperiment(classification, destination);
  const risk = buildRisk(classification, approvalRequired);
  const verification = buildVerification(destination);
  const slug = slugify(validatedInput.noteName);
  const noteWithoutMarkdown = {
    slug,
    generatedAt: validatedInput.generatedAt,
    sourceTitle,
    destination,
    approvalRequired,
    usefulSignal,
    experiment,
    risk,
    verification,
  };

  return {
    ...noteWithoutMarkdown,
    markdown: renderMarkdown(validatedInput, noteWithoutMarkdown, classification),
  };
}
