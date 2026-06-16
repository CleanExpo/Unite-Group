import { buildPersonalIntelligenceReport, type PersonalIntelligenceReport } from './intake-report';
import type { ContentItemInput, PrivacyClass } from './types';

export interface YouTubeManualIntakeInput {
  intakeName: string;
  generatedAt: string;
  url: string;
  title: string;
  channel?: string;
  distilledSummary: string;
  transcript?: string;
  operatorNote?: string;
  operatorNotePrivacyClass?: PrivacyClass;
  consumedForDowntime?: boolean;
  alreadyKnown?: boolean;
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`YouTube manual intake ${field} is required`);
  return trimmed;
}

function buildYouTubeItem(input: YouTubeManualIntakeInput): ContentItemInput {
  return {
    id: `youtube:${requireNonEmpty(input.url, 'url')}`,
    sourceType: 'youtube',
    sourceUrl: requireNonEmpty(input.url, 'url'),
    title: requireNonEmpty(input.title, 'title'),
    creatorOrAuthor: input.channel?.trim() || undefined,
    summary: requireNonEmpty(input.distilledSummary, 'distilledSummary'),
    privacyClass: 'public',
    consumedForDowntime: input.consumedForDowntime,
    alreadyKnown: input.alreadyKnown,
  };
}

function buildOperatorNoteItem(input: YouTubeManualIntakeInput): ContentItemInput | null {
  if (!input.operatorNote?.trim()) return null;

  return {
    id: `youtube-note:${requireNonEmpty(input.url, 'url')}`,
    sourceType: 'manual',
    sourceUrl: requireNonEmpty(input.url, 'url'),
    title: 'Manual YouTube operator note',
    creatorOrAuthor: input.channel?.trim() || undefined,
    notes: input.operatorNote,
    privacyClass: input.operatorNotePrivacyClass ?? 'personal',
  };
}

export function buildYouTubeManualIntakeReport(input: YouTubeManualIntakeInput): PersonalIntelligenceReport {
  const items = [buildYouTubeItem(input)];
  const operatorNoteItem = buildOperatorNoteItem(input);
  if (operatorNoteItem) items.push(operatorNoteItem);

  const report = buildPersonalIntelligenceReport({
    intakeName: input.intakeName,
    generatedAt: input.generatedAt,
    items,
  });

  return {
    ...report,
    markdown: report.markdown.replace(
      '# Personal Intelligence Draft Report',
      '# Personal Intelligence Draft Report\n\nManual YouTube intake',
    ),
  };
}
