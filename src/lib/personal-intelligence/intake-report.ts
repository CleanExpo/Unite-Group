import { classifyContentItem } from './classifier';
import { redactSensitiveText } from './redaction';
import type { ContentItemInput, ContentSourceType, PersonalIntelligenceClassification, PrivacyClass } from './types';

export interface PersonalIntelligenceIntake {
  intakeName: string;
  generatedAt: string;
  items: ContentItemInput[];
}

export interface PersonalIntelligenceReportSummary {
  totalItems: number;
  wasteItems: number;
  approvalGatedItems: number;
  memoryCandidateCount: number;
  taskCandidateCount: number;
}

export interface PersonalIntelligenceReport {
  intakeName: string;
  generatedAt: string;
  summary: PersonalIntelligenceReportSummary;
  classifications: PersonalIntelligenceClassification[];
  markdown: string;
}

const WASTE_LABELS = new Set(['duplicate', 'hype', 'entertainment', 'off-strategy', 'low-confidence', 'reject']);
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

function yesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function summarizeReport(classifications: PersonalIntelligenceClassification[]): PersonalIntelligenceReportSummary {
  return {
    totalItems: classifications.length,
    wasteItems: classifications.filter((item) => WASTE_LABELS.has(item.wasteLabel)).length,
    approvalGatedItems: classifications.filter((item) => item.approvalRequiredBeforeStorage).length,
    memoryCandidateCount: classifications.reduce((total, item) => total + item.memoryCandidates.length, 0),
    taskCandidateCount: classifications.reduce((total, item) => total + item.taskCandidates.length, 0),
  };
}

function renderMemoryCandidates(values: readonly PersonalIntelligenceClassification['memoryCandidates'][number][]): string[] {
  if (values.length === 0) return ['### Draft memory candidates', '', 'none', ''];

  return [
    '### Draft memory candidates',
    '',
    ...values.map((value, index) => `${index + 1}. ${value.proposedMemory} Approval required: ${yesNo(value.approvalRequired)}`),
    '',
  ];
}

function renderTaskCandidates(values: readonly PersonalIntelligenceClassification['taskCandidates'][number][]): string[] {
  if (values.length === 0) return ['### Draft task candidates', '', 'none', ''];

  return [
    '### Draft task candidates',
    '',
    ...values.map((value, index) => `${index + 1}. ${value.title} — ${value.smallestNextAction} Approval required: ${yesNo(value.approvalRequired)}`),
    '',
  ];
}

function renderClassification(item: PersonalIntelligenceClassification, index: number): string[] {
  return [
    `## ${index + 1}. ${item.title}`,
    '',
    `Summary: ${item.summary}`,
    `Approval required before storage: ${yesNo(item.approvalRequiredBeforeStorage)}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Source type | ${escapeTableCell(item.sourceType)} |`,
    `| Source id | ${escapeTableCell(item.id ?? 'none')} |`,
    `| Source URL | ${escapeTableCell(item.sourceUrl ?? 'none')} |`,
    `| Creator/author | ${escapeTableCell(item.creatorOrAuthor ?? 'none')} |`,
    `| Privacy class | ${escapeTableCell(item.privacyClass)} |`,
    `| Approval required before storage | ${yesNo(item.approvalRequiredBeforeStorage)} |`,
    `| Waste label | ${escapeTableCell(item.wasteLabel)} |`,
    `| Waste ratio | ${escapeTableCell(item.wasteRatio)} |`,
    `| Relevance total | ${item.relevanceScores.total} |`,
    `| Topic tags | ${escapeTableCell(listOrNone(item.topicTags))} |`,
    `| Nexus mappings | ${escapeTableCell(listOrNone(item.nexusMappings))} |`,
    `| Raw transcript stored | ${yesNo(item.rawTranscriptStored)} |`,
    '',
    ...renderMemoryCandidates(item.memoryCandidates),
    ...renderTaskCandidates(item.taskCandidates),
    '### Operator notes',
    '',
    ...item.operatorNotes.map((note) => `- ${note}`),
    '',
  ];
}

function renderMarkdown(input: PersonalIntelligenceIntake, classifications: PersonalIntelligenceClassification[]): string {
  const summary = summarizeReport(classifications);
  const lines = [
    '# Personal Intelligence Draft Report',
    '',
    `Intake: ${redactSensitiveText(input.intakeName)}`,
    `Generated at: ${input.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Total items: ${summary.totalItems}`,
    `- Waste items: ${summary.wasteItems}`,
    `- Approval-gated items: ${summary.approvalGatedItems}`,
    `- Draft memory candidates: ${summary.memoryCandidateCount}`,
    `- Draft task candidates: ${summary.taskCandidateCount}`,
    '',
    '## Privacy and retention guardrails',
    '',
    '- This report is local-first and draft-only.',
    '- It stores distilled summaries and classifications, not raw private transcripts/history by default.',
    '- Memory candidates and private/source storage remain approval-gated.',
    '',
    ...classifications.flatMap(renderClassification),
  ];

  return `${lines.join('\n').trim()}\n`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertOptionalString(item: Record<string, unknown>, key: keyof ContentItemInput, index: number): void {
  const value = item[key];
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`Invalid Personal Intelligence intake item ${index}: ${String(key)} must be a string when supplied`);
  }
}

function assertOptionalBoolean(item: Record<string, unknown>, key: keyof ContentItemInput, index: number): void {
  const value = item[key];
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error(`Invalid Personal Intelligence intake item ${index}: ${String(key)} must be a boolean when supplied`);
  }
}

export function validatePersonalIntelligenceIntake(value: unknown): PersonalIntelligenceIntake {
  if (!isPlainObject(value)) throw new Error('Invalid Personal Intelligence intake: expected object');
  if (typeof value.intakeName !== 'string' || value.intakeName.trim().length === 0) {
    throw new Error('Invalid Personal Intelligence intake: expected non-empty intakeName');
  }
  if (typeof value.generatedAt !== 'string' || !isIsoTimestamp(value.generatedAt)) {
    throw new Error('Invalid Personal Intelligence intake: expected generatedAt ISO timestamp');
  }
  if (!Array.isArray(value.items)) throw new Error('Invalid Personal Intelligence intake: expected items[]');

  value.items.forEach((item, index) => {
    if (!isPlainObject(item)) throw new Error(`Invalid Personal Intelligence intake item ${index}: expected object`);
    if (typeof item.sourceType !== 'string' || !SOURCE_TYPES.has(item.sourceType as ContentSourceType)) {
      throw new Error(`Invalid Personal Intelligence intake item ${index}: sourceType is required and must be supported`);
    }
    if (typeof item.title !== 'string' || item.title.trim().length === 0) {
      throw new Error(`Invalid Personal Intelligence intake item ${index}: title is required`);
    }
    if (item.privacyClass !== undefined && (typeof item.privacyClass !== 'string' || !PRIVACY_CLASSES.has(item.privacyClass as PrivacyClass))) {
      throw new Error(`Invalid Personal Intelligence intake item ${index}: privacyClass must be supported when supplied`);
    }

    for (const key of ['id', 'sourceUrl', 'creatorOrAuthor', 'summary', 'transcriptExcerpt', 'notes', 'capturedAt'] as const) {
      assertOptionalString(item, key, index);
    }
    for (const key of ['alreadyKnown', 'consumedForDowntime'] as const) {
      assertOptionalBoolean(item, key, index);
    }
  });

  return value as unknown as PersonalIntelligenceIntake;
}

export function buildPersonalIntelligenceReport(input: PersonalIntelligenceIntake): PersonalIntelligenceReport {
  const validatedInput = validatePersonalIntelligenceIntake(input);
  const classifications = validatedInput.items.map(classifyContentItem);
  const summary = summarizeReport(classifications);
  const markdown = renderMarkdown(validatedInput, classifications);

  return {
    intakeName: redactSensitiveText(validatedInput.intakeName),
    generatedAt: validatedInput.generatedAt,
    summary,
    classifications,
    markdown,
  };
}
