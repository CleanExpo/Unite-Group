import { buildPersonalIntelligenceReport, validatePersonalIntelligenceIntake } from '@/lib/personal-intelligence/intake-report';

const usefulVideo = {
  id: 'yt-geo-001',
  sourceType: 'youtube' as const,
  sourceUrl: 'https://www.youtube.com/watch?v=geo001',
  title: 'AI agents for SEO, GEO, AEO, CRM and content workflows',
  creatorOrAuthor: 'AI Strategy Lab',
  summary:
    'Practical workflow to build AI agent automations for SEO, GEO, AEO, CRM follow-up, content briefs, testing and implementation.',
  transcriptExcerpt:
    'RAW TRANSCRIPT SHOULD NOT APPEAR. Build repeatable workflows and tests for AI search, answer engines, CRM follow-up and content operations.',
};

const privateSearch = {
  id: 'search-private-001',
  sourceType: 'search' as const,
  title: 'private search history export about CRM AI automation',
  summary: 'Personal search-history pattern around AI automation, CRM workflows, and operations.',
};

const actionablePrivateSearch = {
  id: 'search-private-actionable-001',
  sourceType: 'search' as const,
  title: 'private search history export about AI agent CRM SEO GEO AEO automation and founder strategy',
  summary:
    'Personal research pattern around AI agent workflows, CRM sales, SEO, GEO, AEO, founder strategy, implementation, testing and automation.',
};

const entertainment = {
  id: 'downtime-001',
  sourceType: 'youtube' as const,
  title: 'Football highlights and comedy reactions',
  summary: 'Entertainment video watched for downtime.',
  consumedForDowntime: true,
};

describe('buildPersonalIntelligenceReport', () => {
  it('builds a local markdown report with required routing fields and no raw transcript retention', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'phase-1a-fixture',
      items: [usefulVideo],
    });

    expect(report.markdown).toContain('# Personal Intelligence Draft Report');
    expect(report.markdown).toContain('phase-1a-fixture');
    expect(report.markdown).toContain('AI agents for SEO, GEO, AEO, CRM and content workflows');
    expect(report.markdown).toContain('[redacted-url]');
    expect(report.markdown).not.toContain('https://www.youtube.com/watch?v=geo001');
    expect(report.markdown).toContain('AI Strategy Lab');
    expect(report.markdown).toContain('Waste label');
    expect(report.markdown).toContain('Relevance total');
    expect(report.markdown).toContain('Nexus mappings');
    expect(report.markdown).toContain('marketing_strategy');
    expect(report.markdown).toContain('ai_enhancement_pipeline');
    expect(report.markdown).toContain('Draft task candidates');
    expect(report.markdown).not.toContain('RAW TRANSCRIPT SHOULD NOT APPEAR');
    expect(report.classifications).toHaveLength(1);
    expect(report.classifications[0].rawTranscriptStored).toBe(false);
  });

  it('approval-gates private/manual-ish sources in the report when privacy class is omitted', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'private-source-fixture',
      items: [privateSearch],
    });

    expect(report.classifications[0].privacyClass).toBe('personal');
    expect(report.classifications[0].approvalRequiredBeforeStorage).toBe(true);
    expect(report.markdown).toContain('Approval required before storage: yes');
    expect(report.markdown).toContain('Approval required before storing raw/source data');
  });

  it('does not leak transcript excerpts into report summaries when no distilled summary exists', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'raw-transcript-guard-fixture',
      items: [
        {
          sourceType: 'manual',
          title: 'Private voice note about AI agent CRM workflow',
          transcriptExcerpt: 'PRIVATE RAW TRANSCRIPT SENTINEL. Implement CRM workflow automation and SEO tests.',
        },
      ],
    });

    expect(report.markdown).toContain('distilled summary required before storage or routing');
    expect(report.markdown).not.toContain('PRIVATE RAW TRANSCRIPT SENTINEL');
    expect(report.classifications[0].approvalRequiredBeforeStorage).toBe(true);
  });

  it('redacts explicit summaries in report classifications, insight claims, and rendered markdown', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'redacted-summary-fixture',
      items: [
        {
          sourceType: 'manual',
          title: 'AI agent CRM SEO GEO AEO founder strategy automation workflow',
          summary:
            'Approved AI agent CRM SEO GEO AEO founder strategy workflow. Email founder@example.com and set api key: sk-live-secret before implementation.',
          privacyClass: 'personal',
        },
      ],
    });

    const serialized = JSON.stringify(report);
    expect(report.classifications[0].summary).toContain('[redacted-email]');
    expect(report.classifications[0].summary).toContain('[redacted-secret]');
    expect(report.classifications[0].insights[0]?.claim).toBe(report.classifications[0].summary);
    expect(report.markdown).toContain('[redacted-email]');
    expect(report.markdown).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('sk-live-secret');
  });

  it('does not classify general intake from raw transcript excerpts or notes without a distilled summary', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'raw-haystack-guard-fixture',
      items: [
        {
          sourceType: 'manual',
          title: 'Neutral imported item',
          transcriptExcerpt:
            'RAW_GENERAL_SENTINEL AI agent CRM SEO GEO AEO founder strategy privacy secret guaranteed 10x overnight implement checklist.',
          notes:
            'RAW_GENERAL_NOTES_SENTINEL platform pricing client service automation workflow security compliance leak rumor.',
        },
      ],
    });

    const classification = report.classifications[0];
    const serialized = JSON.stringify(report);
    expect(classification.topicTags).toEqual([]);
    expect(classification.nexusMappings).toEqual(['waste_register']);
    expect(classification.memoryCandidates).toHaveLength(0);
    expect(classification.taskCandidates).toHaveLength(0);
    expect(classification.wasteLabel).toBe('reject');
    expect(serialized).not.toContain('RAW_GENERAL_SENTINEL');
    expect(serialized).not.toContain('RAW_GENERAL_NOTES_SENTINEL');
  });

  it('marks task candidates from approval-gated sources as approval-required', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'private-actionable-fixture',
      items: [actionablePrivateSearch],
    });

    expect(report.classifications[0].approvalRequiredBeforeStorage).toBe(true);
    expect(report.classifications[0].taskCandidates).toHaveLength(1);
    expect(report.classifications[0].taskCandidates[0].approvalRequired).toBe(true);
    expect(report.markdown).toContain('Approval required: yes');
  });

  it('separates useful, approval-gated, and waste items into report counts', () => {
    const report = buildPersonalIntelligenceReport({
      generatedAt: '2026-05-25T10:00:00.000Z',
      intakeName: 'mixed-fixture',
      items: [usefulVideo, privateSearch, entertainment],
    });

    expect(report.summary.totalItems).toBe(3);
    expect(report.summary.wasteItems).toBe(1);
    expect(report.summary.approvalGatedItems).toBe(1);
    expect(report.summary.taskCandidateCount).toBeGreaterThanOrEqual(1);
    expect(report.markdown).toContain('Total items: 3');
    expect(report.markdown).toContain('Waste items: 1');
    expect(report.markdown).toContain('Approval-gated items: 1');
    expect(report.markdown).toContain('Football highlights and comedy reactions');
    expect(report.markdown).toContain('waste_register');
  });

  it('rejects invalid intake source and privacy values before report generation', () => {
    expect(() =>
      validatePersonalIntelligenceIntake({
        intakeName: 'invalid-fixture',
        generatedAt: '2026-05-25T10:00:00.000Z',
        items: [{ sourceType: 'bad-source', title: 'Invalid source' }],
      }),
    ).toThrow('sourceType is required and must be supported');

    expect(() =>
      validatePersonalIntelligenceIntake({
        intakeName: 'invalid-fixture',
        generatedAt: '2026-05-25T10:00:00.000Z',
        items: [{ sourceType: 'search', title: 'Invalid privacy', privacyClass: 'open-web' }],
      }),
    ).toThrow('privacyClass must be supported');
  });
});
