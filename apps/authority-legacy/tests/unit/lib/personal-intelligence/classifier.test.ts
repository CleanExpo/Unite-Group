import { classifyContentItem } from '@/lib/personal-intelligence/classifier';

const geoVideo = {
  sourceType: 'youtube' as const,
  title: 'GEO and AEO strategy for AI search, LLM answer engines, and authority content',
  summary:
    'A practical framework to build authority content for generative engine optimization, answer engine optimization, SEO, and AI search workflows.',
  transcriptExcerpt:
    'Use structured content briefs, entity-rich pages, and repeatable workflows to win answer engines. Implement a test and checklist before scaling.',
};

describe('classifyContentItem', () => {
  it('maps a useful AI/GEO video into marketing and AI enhancement lanes', () => {
    const result = classifyContentItem(geoVideo);

    expect(result.sourceType).toBe('youtube');
    expect(result.topicTags).toEqual(expect.arrayContaining(['geo', 'aeo', 'seo', 'ai_models', 'content_strategy']));
    expect(result.nexusMappings).toEqual(expect.arrayContaining(['marketing_strategy', 'ai_enhancement_pipeline']));
    expect(result.wasteLabel).toBe('useful');
    expect(result.wasteRatio).toBe('low');
    expect(result.relevanceScores.total).toBeGreaterThanOrEqual(12);
    expect(result.taskCandidates).toHaveLength(1);
    expect(result.rawTranscriptStored).toBe(false);
  });

  it('rejects entertainment-only downtime instead of turning it into Nexus work', () => {
    const result = classifyContentItem({
      sourceType: 'youtube',
      title: 'Football highlights and comedy reactions',
      consumedForDowntime: true,
      summary: 'Entertainment video watched for downtime.',
    });

    expect(result.topicTags).toContain('entertainment_personal');
    expect(result.wasteLabel).toBe('entertainment');
    expect(result.nexusMappings).toContain('waste_register');
    expect(result.taskCandidates).toHaveLength(0);
    expect(result.memoryCandidates).toHaveLength(0);
  });

  it('requires approval before storing private or sensitive source data', () => {
    const result = classifyContentItem({
      sourceType: 'search',
      title: 'private search history export about AI automation and CRM workflow',
      privacyClass: 'sensitive',
      summary: 'Search history may contain personal queries, client context, or sensitive data.',
    });

    expect(result.approvalRequiredBeforeStorage).toBe(true);
    expect(result.rawTranscriptStored).toBe(false);
    expect(result.operatorNotes.join(' ')).toContain('Approval required before storing raw/source data');
  });

  it('does not let omitted privacy class bypass approval for search, chat, voice, export, or manual sources', () => {
    for (const sourceType of ['search', 'chat', 'voice', 'export', 'manual'] as const) {
      const result = classifyContentItem({
        sourceType,
        title: 'AI automation and CRM workflow notes',
        summary: 'Potentially personal founder notes about AI automation, CRM workflow, and operations.',
      });

      expect(result.privacyClass).toBe('personal');
      expect(result.approvalRequiredBeforeStorage).toBe(true);
    }
  });

  it('marks already-known content as duplicate and avoids durable memory writes', () => {
    const result = classifyContentItem({
      ...geoVideo,
      alreadyKnown: true,
    });

    expect(result.wasteLabel).toBe('duplicate');
    expect(result.nexusMappings).toContain('waste_register');
    expect(result.memoryCandidates).toHaveLength(0);
  });

  it('only proposes durable memory for stable founder strategy patterns', () => {
    const result = classifyContentItem({
      sourceType: 'podcast',
      title: 'Founder strategy: scenario planning 25 moves ahead for a $2B platform',
      summary:
        'A founder operating model for long-horizon decision trees, agentic thinking, business model leverage, and strategic execution.',
    });

    expect(result.topicTags).toEqual(expect.arrayContaining(['leadership_founder', 'agentic_thinking']));
    expect(result.nexusMappings).toContain('agentic_thinking');
    expect(result.memoryCandidates).toHaveLength(1);
    expect(result.memoryCandidates[0].approvalRequired).toBe(true);
  });

  it('requires a distilled summary instead of promoting raw transcript text', () => {
    const result = classifyContentItem({
      sourceType: 'youtube',
      title: 'AI agent workflow for Nexus',
      transcriptExcerpt: 'RAW TRANSCRIPT SHOULD NOT APPEAR. Implement a repeatable AI agent workflow for CRM, SEO, GEO, and client operations.'.repeat(10),
    });

    expect(result.summary).toBe('AI agent workflow for Nexus — distilled summary required before storage or routing.');
    expect(result.summary).not.toContain('RAW TRANSCRIPT SHOULD NOT APPEAR');
    expect(result.rawTranscriptStored).toBe(false);
  });

  it('does not let raw transcript excerpts or notes influence classification when distilled summary is missing', () => {
    const rawSentinel = [
      'RAW_SENTINEL_PRIVACY_SECRET_FOUNDER_STRATEGY',
      'AI agent workflow for SEO GEO AEO CRM sales client service.',
      'Scenario planning 25 moves ahead with $2B valuation pricing platform automation API checklist implement.',
      'Guaranteed secret hack 10x overnight leak rumor compliance privacy security.',
    ].join(' ');

    const result = classifyContentItem({
      sourceType: 'manual',
      title: 'Neutral clipped item',
      creatorOrAuthor: 'Neutral Creator',
      transcriptExcerpt: rawSentinel,
      notes: rawSentinel,
    });

    const serialized = JSON.stringify(result);
    expect(result.summary).toBe('Neutral clipped item — distilled summary required before storage or routing.');
    expect(result.topicTags).toEqual([]);
    expect(result.nexusMappings).toEqual(['waste_register']);
    expect(result.memoryCandidates).toHaveLength(0);
    expect(result.taskCandidates).toHaveLength(0);
    expect(result.wasteLabel).toBe('reject');
    expect(result.relevanceScores.total).toBe(2);
    expect(serialized).not.toContain('RAW_SENTINEL_PRIVACY_SECRET_FOUNDER_STRATEGY');
    expect(serialized).not.toContain('10x overnight');
  });

  it('redacts explicit summaries before classification summaries and insight claims are emitted', () => {
    const result = classifyContentItem({
      sourceType: 'manual',
      title: 'AI agent CRM SEO GEO AEO founder strategy automation workflow',
      summary:
        'Approved AI agent CRM SEO GEO AEO founder strategy workflow. Contact founder@example.com and use API key is *** before implementation.',
      privacyClass: 'personal',
    });

    const serialized = JSON.stringify(result);
    expect(result.summary).toContain('[redacted-email]');
    expect(result.summary).toContain('[redacted-secret]');
    expect(result.summary).not.toContain('founder@example.com');
    expect(result.summary).not.toContain('***');
    expect(result.insights[0]?.claim).toBe(result.summary);
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('***');
  });

  it('redacts sensitive title, source URL, and creator metadata at classifier output boundaries', () => {
    const result = classifyContentItem({
      sourceType: 'manual',
      title: 'AI agent CRM SEO GEO AEO founder strategy automation workflow founder@example.com API key is ***',
      sourceUrl: 'https://founder@example.com/research?token=abc',
      creatorOrAuthor: 'Founder founder@example.com secret is ***',
      summary:
        'Approved AI agent CRM SEO GEO AEO founder strategy automation workflow with implementation checklist for client service.',
      privacyClass: 'personal',
    });

    const serialized = JSON.stringify(result);
    expect(result.title).toContain('[redacted-email]');
    expect(result.title).toContain('[redacted-secret]');
    expect(result.sourceUrl).toBe('[redacted-url]');
    expect(result.creatorOrAuthor).toContain('[redacted-email]');
    expect(result.creatorOrAuthor).toContain('[redacted-secret]');
    expect(result.taskCandidates[0]?.title).toContain('[redacted-email]');
    expect(result.taskCandidates[0]?.title).toContain('[redacted-secret]');
    expect(result.taskCandidates[0]?.title).not.toContain('founder@example.com');
    expect(result.taskCandidates[0]?.title).not.toContain('***');
    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('***');
  });

  it('suppresses high-scoring rumor/leak content as low-confidence without operational outputs', () => {
    const result = classifyContentItem({
      sourceType: 'article',
      title: 'Unconfirmed leak: AI agent CRM SEO GEO AEO playbook for automation workflow',
      summary:
        'Rumor says an unconfirmed leak describes an actionable AI agent CRM SEO GEO AEO automation workflow with an implementation checklist, framework, and test plan.',
    });

    expect(result.wasteLabel).toBe('low-confidence');
    expect(result.wasteRatio).toBe('high');
    expect(result.nexusMappings).not.toEqual(expect.arrayContaining(['marketing_strategy', 'ai_enhancement_pipeline', 'crm', 'client_2nd_brain']));
    expect(result.nexusMappings).toEqual(expect.arrayContaining(['waste_register', 'parked_research']));
    expect(result.insights).toHaveLength(0);
    expect(result.taskCandidates).toHaveLength(0);
    expect(result.memoryCandidates).toHaveLength(0);
  });

  it('redacts URLs and payment-card-like fragments from classifier output', () => {
    const result = classifyContentItem({
      sourceType: 'manual',
      title: 'AI agent CRM SEO GEO AEO workflow with visa ending 4242',
      sourceUrl: 'https://example.com/private?token=abc',
      summary:
        'Distilled summary at https://example.com/private?token=abc references visa ending 4242, mastercard ending 4444, amex 1234, discover card 6011111111111117, and long card-ish digits 4111 1111 1111 1111.',
      privacyClass: 'personal',
    });

    const serialized = JSON.stringify(result);
    expect(result.sourceUrl).toBe('[redacted-url]');
    expect(serialized).toContain('[redacted-url]');
    expect(serialized).toContain('[redacted-card]');
    expect(serialized).not.toContain('https://example.com/private?token=abc');
    expect(serialized).not.toContain('visa ending 4242');
    expect(serialized).not.toContain('mastercard ending 4444');
    expect(serialized).not.toContain('amex 1234');
    expect(serialized).not.toContain('6011111111111117');
    expect(serialized).not.toContain('4111 1111 1111 1111');
  });

  it('does not classify redaction marker text injected into summaries as security/privacy content', () => {
    const result = classifyContentItem({
      sourceType: 'manual',
      title: 'AI agent CRM SEO GEO AEO content strategy workflow automation for client service',
      summary:
        'AI agent CRM SEO GEO AEO content strategy workflow automation for client service with an implementation checklist. API key is sk-test12345.',
      privacyClass: 'personal',
    });

    expect(result.summary).toContain('[redacted-secret]');
    expect(result.topicTags).toEqual(expect.arrayContaining(['ai_agents', 'crm_sales', 'automation_integration', 'client_service']));
    expect(result.topicTags).not.toContain('security_privacy');
    expect(result.taskCandidates).toHaveLength(1);
  });
});
