import { buildYouTubeManualIntakeReport } from '@/lib/personal-intelligence/youtube-intake';

const transcript = `
RAW YOUTUBE TRANSCRIPT SENTINEL. This video explains practical AI agent workflows for SEO, GEO, AEO,
CRM follow-up, content operations, implementation testing, and founder strategy. The system should
turn useful signal into Nexus experiments while filtering vendor hype and entertainment.
`;

describe('buildYouTubeManualIntakeReport', () => {
  it('builds a local draft report from explicit YouTube metadata and transcript without retaining raw transcript text', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-phase-1b',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://www.youtube.com/watch?v=phase1b001',
      title: 'AI agents for SEO GEO AEO and CRM workflows',
      channel: 'Practical AI Operator',
      distilledSummary:
        'Practical YouTube walkthrough for converting AI agent, SEO, GEO, AEO, CRM and content operations learning into tested Nexus experiments.',
      transcript,
    });

    const serializedClassification = JSON.stringify(report.classifications[0]);
    expect(report.summary.totalItems).toBe(1);
    expect(report.summary.wasteItems).toBe(0);
    expect(report.summary.taskCandidateCount).toBe(1);
    expect(report.classifications[0].sourceType).toBe('youtube');
    expect(report.classifications[0].sourceUrl).toBe('[redacted-url]');
    expect(report.classifications[0].creatorOrAuthor).toBe('Practical AI Operator');
    expect(report.classifications[0].rawTranscriptStored).toBe(false);
    expect(report.markdown).toContain('Manual YouTube intake');
    expect(report.markdown).toContain('Practical AI Operator');
    expect(report.markdown).toContain('marketing_strategy');
    expect(report.markdown).toContain('ai_enhancement_pipeline');
    expect(report.markdown).not.toContain('RAW YOUTUBE TRANSCRIPT SENTINEL');
    expect(serializedClassification).not.toContain('RAW YOUTUBE TRANSCRIPT SENTINEL');
  });

  it('does not use raw transcript text for manual YouTube classification tags', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-no-transcript-classification',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://www.youtube.com/watch?v=no-raw-transcript',
      title: 'Public productivity walkthrough',
      channel: 'Practical AI Operator',
      distilledSummary: 'Public workflow summary for tested operating cadence.',
      transcript: 'RAW TRANSCRIPT SECRET PRIVACY COMPLIANCE SENTINEL with security privacy secret terms.',
    });

    expect(report.classifications[0].topicTags).not.toContain('security_privacy');
    expect(JSON.stringify(report.classifications[0])).not.toContain('RAW TRANSCRIPT SECRET PRIVACY COMPLIANCE SENTINEL');
    expect(report.markdown).not.toContain('RAW TRANSCRIPT SECRET PRIVACY COMPLIANCE SENTINEL');
  });

  it('marks personal operator notes as approval-gated without blocking public YouTube classification', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-with-private-note',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://youtu.be/phase1b002',
      title: 'Nexus founder strategy and AI agent delivery loop',
      channel: 'Founder Systems',
      distilledSummary:
        'Founder strategy discussion about AI agents, delivery loops, CRM automation, and compounding operational leverage.',
      transcript: 'Transcript discusses AI agents, founder strategy, CRM, automation, and implementation.',
      operatorNote: 'PRIVATE OPERATOR NOTE SENTINEL: Phill is considering a sensitive internal decision.',
      operatorNotePrivacyClass: 'personal',
    });

    expect(report.summary.totalItems).toBe(2);
    expect(report.summary.approvalGatedItems).toBe(1);
    expect(report.classifications[0].approvalRequiredBeforeStorage).toBe(false);
    expect(report.classifications[1].sourceType).toBe('manual');
    expect(report.classifications[1].approvalRequiredBeforeStorage).toBe(true);
    expect(report.markdown).not.toContain('PRIVATE OPERATOR NOTE SENTINEL');
    expect(report.markdown).toContain('Manual YouTube operator note — distilled summary required before storage or routing.');
  });

  it('does not let private operator note text influence the operator-note classification', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-operator-note-no-classification',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://youtu.be/operator-note-sentinel',
      title: 'Neutral public walkthrough',
      channel: 'Neutral Channel',
      distilledSummary: 'Public workflow summary for a neutral operating cadence.',
      operatorNote:
        'PRIVATE_NOTE_CLASSIFIER_SENTINEL AI agent CRM SEO GEO AEO founder strategy privacy secret guaranteed 10x overnight implement checklist.',
      operatorNotePrivacyClass: 'personal',
    });

    const noteClassification = report.classifications[1];
    const serializedNoteClassification = JSON.stringify(noteClassification);
    expect(noteClassification.topicTags).toEqual([]);
    expect(noteClassification.nexusMappings).toEqual(['waste_register']);
    expect(noteClassification.memoryCandidates).toHaveLength(0);
    expect(noteClassification.taskCandidates).toHaveLength(0);
    expect(noteClassification.wasteLabel).toBe('reject');
    expect(serializedNoteClassification).not.toContain('PRIVATE_NOTE_CLASSIFIER_SENTINEL');
    expect(report.markdown).not.toContain('PRIVATE_NOTE_CLASSIFIER_SENTINEL');
  });

  it('redacts explicit distilled YouTube summaries in manual intake reports', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-redacted-summary',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://youtu.be/redacted-summary',
      title: 'AI agents for CRM SEO GEO AEO workflows',
      channel: 'Private Setup Channel',
      distilledSummary:
        'Approved AI agent CRM SEO GEO AEO workflow. Email founder@example.com and use api_key: *** before implementation.',
    });

    const serialized = JSON.stringify(report);
    expect(report.classifications[0].summary).toContain('[redacted-email]');
    expect(report.classifications[0].summary).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('***');
  });

  it('redacts sensitive URL metadata from YouTube source ids and rendered Source id rows', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-redacted-source-id',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://founder@example.com/research?token=TEST_TOKEN_SENTINEL',
      title: 'AI agents for CRM SEO GEO AEO workflows',
      channel: 'Private Setup Channel',
      distilledSummary:
        'Approved AI agent CRM SEO GEO AEO workflow for implementation testing and content operations.',
    });

    const serialized = JSON.stringify(report);
    expect(report.classifications[0].id).toBe('youtube:[redacted-url]');
    expect(report.markdown).toContain('| Source id | youtube:[redacted-url] |');
    expect(serialized).toContain('[redacted-url]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('TEST_TOKEN_SENTINEL');
  });

  it('redacts sensitive URL metadata from emitted ids and rendered Source id fields', () => {
    const rawEmail = 'source-id@example.test';
    const rawToken = 'REPORT_SOURCE_ID_TOKEN_SENTINEL';
    const sensitiveUrl = `https://www.youtube.com/watch?v=source-id-leak&email=${rawEmail}&token=${rawToken}`;

    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-redacted-source-id',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: sensitiveUrl,
      title: 'AI agents for CRM SEO GEO AEO workflows',
      channel: 'Private Setup Channel',
      distilledSummary: 'Approved AI agent CRM SEO GEO AEO workflow for implementation testing.',
    });

    const serialized = JSON.stringify(report);
    const sourceIdLine = report.markdown
      .split('\n')
      .find((line: string) => line.startsWith('| Source id |'));

    expect(report.classifications[0].id).toBe('youtube:[redacted-url]');
    expect(sourceIdLine).toContain('[redacted-url]');
    expect(sourceIdLine).not.toContain(rawEmail);
    expect(sourceIdLine).not.toContain(rawToken);
    expect(serialized).toContain('[redacted-url]');
    expect(serialized).not.toContain(rawEmail);
    expect(serialized).not.toContain(rawToken);
  });

  it('filters explicit entertainment/downtime YouTube intake into the waste register', () => {
    const report = buildYouTubeManualIntakeReport({
      intakeName: 'manual-youtube-downtime',
      generatedAt: '2026-05-25T12:00:00.000Z',
      url: 'https://www.youtube.com/watch?v=downtime001',
      title: 'Football highlights and comedy clips',
      channel: 'Weekend Highlights',
      distilledSummary: 'Entertainment video watched for downtime.',
      transcript: 'Fun football highlights and comedy reactions.',
      consumedForDowntime: true,
    });

    expect(report.summary.totalItems).toBe(1);
    expect(report.summary.wasteItems).toBe(1);
    expect(report.classifications[0].wasteLabel).toBe('entertainment');
    expect(report.classifications[0].nexusMappings).toContain('waste_register');
    expect(report.markdown).toContain('Do not operationalize this item unless Phill explicitly marks it as strategically relevant.');
  });
});
