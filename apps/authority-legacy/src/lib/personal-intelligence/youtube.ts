import type { ContentItemInput } from './types';
import { classifyContentItem } from './classifier';
import { redactSensitiveText } from './redaction';

export interface YouTubeTranscriptInput {
  url: string;
  title: string;
  channel?: string;
  transcriptText?: string;
  summary?: string;
  privacyClass?: ContentItemInput['privacyClass'];
}

const DISTILLED_SUMMARY_REQUIRED = 'Distilled summary required before storage or routing.';

const summarizeTranscript = (input: YouTubeTranscriptInput): string => {
  if (input.summary?.trim()) return redactSensitiveText(input.summary.trim());

  return DISTILLED_SUMMARY_REQUIRED;
};

export function classifyYouTubeTranscript(input: YouTubeTranscriptInput) {
  const hasExplicitSummary = Boolean(input.summary?.trim());

  return classifyContentItem({
    sourceType: 'youtube',
    sourceUrl: input.url,
    title: hasExplicitSummary ? input.title : 'YouTube item pending distilled summary',
    creatorOrAuthor: hasExplicitSummary ? input.channel : undefined,
    summary: summarizeTranscript(input),
    privacyClass: input.privacyClass ?? 'public',
  });
}
