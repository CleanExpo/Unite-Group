import { classifyYouTubeTranscript } from '@/lib/personal-intelligence/youtube';

describe('classifyYouTubeTranscript', () => {
  it('does not classify or summarize from raw YouTube transcript text without an explicit distilled summary', () => {
    const result = classifyYouTubeTranscript({
      url: 'https://www.youtube.com/watch?v=example12345',
      title: 'Neutral public video',
      channel: 'AI Strategy Lab',
      transcriptText:
        'RAW_YOUTUBE_TRANSCRIPT_SENTINEL. This tutorial explains how to implement AI agent workflows for SEO, generative engine optimization, answer engine optimization, content briefs, and CRM follow up.',
    });

    const serialized = JSON.stringify(result);
    expect(result.sourceType).toBe('youtube');
    expect(result.topicTags).toEqual([]);
    expect(result.nexusMappings).toEqual(['waste_register']);
    expect(result.wasteLabel).toBe('reject');
    expect(result.rawTranscriptStored).toBe(false);
    expect(result.summary).toBe('Distilled summary required before storage or routing.');
    expect(serialized).not.toContain('RAW_YOUTUBE_TRANSCRIPT_SENTINEL');
    expect(serialized).not.toContain('generative engine optimization');
    expect(result.approvalRequiredBeforeStorage).toBe(false);
  });

  it('uses an explicit summary instead of transcript fallback when supplied', () => {
    const result = classifyYouTubeTranscript({
      url: 'https://www.youtube.com/watch?v=explicit-summary',
      title: 'AI operating cadence',
      summary: 'Use this approved distilled summary for AI operating cadence.',
      transcriptText: 'This transcript sentence should not become the returned summary.',
    });

    expect(result.summary).toBe('Use this approved distilled summary for AI operating cadence.');
    expect(JSON.stringify(result)).not.toContain('This transcript sentence should not become');
    expect(result.rawTranscriptStored).toBe(false);
  });

  it('does not derive secret-like or contact details from transcript-derived summaries', () => {
    const result = classifyYouTubeTranscript({
      url: 'https://www.youtube.com/watch?v=secret-transcript',
      title: 'AI agents with private setup notes',
      transcriptText:
        'The API key is sk-liv...cdef and contact founder@example.com before implementing AI agent workflows. Then discuss SEO and CRM follow up.',
    });

    const serialized = JSON.stringify(result);
    expect(result.summary).toBe('Distilled summary required before storage or routing.');
    expect(serialized).not.toContain('sk-liv...cdef');
    expect(serialized).not.toContain('founder@example.com');
    expect(result.rawTranscriptStored).toBe(false);
  });

  it('redacts secret-like and contact details from explicit summaries', () => {
    const result = classifyYouTubeTranscript({
      url: 'https://www.youtube.com/watch?v=secret-summary',
      title: 'AI agents with explicit private setup summary',
      summary:
        'Use API key is sk-explicit1234 and email founder@example.com before implementing AI agent workflows.',
      transcriptText: 'This transcript should not be needed for the explicit summary.',
    });

    const serialized = JSON.stringify(result);
    expect(result.summary).toContain('[redacted-secret]');
    expect(result.summary).toContain('[redacted-email]');
    expect(serialized).not.toContain('sk-explicit1234');
    expect(serialized).not.toContain('founder@example.com');
    expect(result.rawTranscriptStored).toBe(false);
  });

  it('approval-gates private YouTube notes when classified as personal', () => {
    const result = classifyYouTubeTranscript({
      url: 'https://www.youtube.com/watch?v=private-notes',
      title: 'Founder decision notes from watch history',
      summary: 'Personal notes about founder strategy, decision making, and AI automation.',
      privacyClass: 'personal',
    });

    expect(result.approvalRequiredBeforeStorage).toBe(true);
    expect(result.rawTranscriptStored).toBe(false);
  });
});
