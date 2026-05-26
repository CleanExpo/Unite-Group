import { buildNexusMappingNote, validateNexusMappingNoteInput } from '@/lib/personal-intelligence/nexus-mapping-note';
import type { PersonalIntelligenceClassification } from '@/lib/personal-intelligence/types';

const usefulClassification: PersonalIntelligenceClassification = {
  id: 'youtube:https://www.youtube.com/watch?v=phase1c001',
  sourceType: 'youtube',
  sourceUrl: 'https://www.youtube.com/watch?v=phase1c001',
  creatorOrAuthor: 'Practical AI Operator',
  title: 'AI agents for SEO GEO AEO CRM and 25 steps ahead planning',
  summary:
    'Practical workflow for converting AI agent, SEO, GEO, AEO, CRM, and 25 steps ahead scenario planning into tested Nexus experiments.',
  privacyClass: 'public',
  topicTags: ['ai_agents', 'agentic_thinking', 'seo', 'geo', 'aeo', 'crm_sales', 'automation_integration'],
  wasteLabel: 'useful',
  wasteRatio: 'low',
  relevanceScores: {
    revenue: 3,
    operating: 3,
    data: 2,
    client: 3,
    strategic: 3,
    actionability: 3,
    confidence: 3,
    total: 20,
  },
  nexusMappings: ['marketing_strategy', 'ai_enhancement_pipeline', 'agentic_thinking', 'crm', 'client_2nd_brain'],
  insights: [
    {
      claim:
        'Practical workflow for converting AI agent, SEO, GEO, AEO, CRM, and 25 steps ahead scenario planning into tested Nexus experiments.',
      whyItMatters: 'Useful for turning personal learning into local-first Nexus execution leverage.',
      confidence: 'high',
      nexusMappings: ['marketing_strategy', 'ai_enhancement_pipeline', 'agentic_thinking'],
    },
  ],
  memoryCandidates: [
    {
      proposedMemory:
        'Phill values long-horizon strategic intelligence that converts learning into Nexus execution leverage.',
      memoryType: 'user_preference',
      durabilityReason: 'Stable founder operating preference.',
      approvalRequired: true,
    },
  ],
  taskCandidates: [
    {
      title: 'Review Nexus application of: AI agents for SEO GEO AEO CRM and 25 steps ahead planning',
      lane: 'marketing',
      smallestNextAction: 'Create a short Nexus mapping note with one experiment, one risk, and one verification step.',
      verification: 'Read back the mapping note and confirm source, signal, waste decision, and destination.',
      approvalRequired: false,
    },
  ],
  approvalRequiredBeforeStorage: false,
  rawTranscriptStored: false,
  operatorNotes: ['Public or explicitly supplied content may be processed locally.'],
};

describe('buildNexusMappingNote', () => {
  it('turns one high-value classification into a local Nexus action note', () => {
    const note = buildNexusMappingNote({
      noteName: 'phase-1c-useful-youtube-note',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: usefulClassification,
    });

    expect(note.slug).toBe('phase-1c-useful-youtube-note');
    expect(note.approvalRequired).toBe(true);
    expect(note.destination).toBe('marketing_strategy');
    expect(note.experiment).toContain('Nexus mapping experiment');
    expect(note.risk).toContain('approval-gated');
    expect(note.verification).toContain('Read back this note');
    expect(note.markdown).toContain('# Nexus Mapping Note: phase-1c-useful-youtube-note');
    expect(note.markdown).toContain('Source URL: [redacted-url]');
    expect(note.markdown).toContain('Useful signal');
    expect(note.markdown).toContain('Why it matters');
    expect(note.markdown).toContain('Useful for turning personal learning into local-first Nexus execution leverage.');
    expect(note.markdown).toContain('Waste decision: useful / low');
    expect(note.markdown).toContain('Nexus destination: marketing_strategy');
    expect(note.markdown).toContain('One experiment');
    expect(note.markdown).toContain('One risk');
    expect(note.markdown).toContain('One verification step');
    expect(note.markdown).toContain('Draft memory candidate');
    expect(note.markdown).toContain('Draft task candidate');
    expect(note.markdown).toContain('Approval required: yes');
    expect(note.markdown).toContain('Approval gate');
  });

  it('gates private classifications and private candidates in the generated note', () => {
    const privateClassification: PersonalIntelligenceClassification = {
      ...usefulClassification,
      sourceType: 'search',
      sourceUrl: undefined,
      privacyClass: 'personal',
      approvalRequiredBeforeStorage: true,
      taskCandidates: [{ ...usefulClassification.taskCandidates[0], approvalRequired: true }],
    };

    const note = buildNexusMappingNote({
      noteName: 'phase-1c-private-note',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: privateClassification,
    });

    expect(note.approvalRequired).toBe(true);
    expect(note.markdown).toContain('Approval required: yes');
    expect(note.markdown).toContain('Approval gate');
    expect(note.markdown).toContain('Do not store raw/source data or execute task candidates until approved.');
  });

  it('approval-gates private privacy classes even if parsed approvalRequiredBeforeStorage is stale', () => {
    const stalePrivateClassification: PersonalIntelligenceClassification = {
      ...usefulClassification,
      privacyClass: 'client',
      approvalRequiredBeforeStorage: false,
      memoryCandidates: [],
      taskCandidates: [],
    };

    const note = buildNexusMappingNote({
      noteName: 'phase-1c-stale-private-gate',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: stalePrivateClassification,
    });

    expect(note.approvalRequired).toBe(true);
    expect(note.markdown).toContain('Approval gate');
  });

  it('keeps waste classifications as a waste-register note instead of operationalizing them', () => {
    const wasteClassification: PersonalIntelligenceClassification = {
      ...usefulClassification,
      title: 'Football highlights and comedy clips',
      summary: 'Entertainment video watched for downtime.',
      topicTags: ['entertainment_personal'],
      wasteLabel: 'entertainment',
      wasteRatio: 'high',
      relevanceScores: { revenue: 0, operating: 0, data: 0, client: 0, strategic: 0, actionability: 0, confidence: 2, total: 2 },
      nexusMappings: ['waste_register'],
      insights: [],
      memoryCandidates: [],
      taskCandidates: [],
    };

    const note = buildNexusMappingNote({
      noteName: 'phase-1c-waste-note',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: wasteClassification,
    });

    expect(note.destination).toBe('waste_register');
    expect(note.experiment).toContain('No experiment');
    expect(note.risk).toContain('Accidentally operationalizing waste');
    expect(note.markdown).toContain('Nexus destination: waste_register');
    expect(note.markdown).toContain('No experiment — retain as waste-register evidence only.');
    expect(note.markdown).not.toContain('Draft task candidate');
  });

  it('forces waste-labeled classifications to the waste register even when mappings include operational destinations', () => {
    const wasteWithOperationalMapping: PersonalIntelligenceClassification = {
      ...usefulClassification,
      wasteLabel: 'hype',
      wasteRatio: 'high',
      nexusMappings: ['marketing_strategy', 'waste_register'],
      memoryCandidates: [],
      taskCandidates: [],
    };

    const note = buildNexusMappingNote({
      noteName: 'phase-1c-waste-with-operational-mapping',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: wasteWithOperationalMapping,
    });

    expect(note.destination).toBe('waste_register');
    expect(note.markdown).toContain('Nexus destination: waste_register');
    expect(note.markdown).toContain('No experiment — retain as waste-register evidence only.');
  });

  it('forces low-confidence classifications to the waste register', () => {
    const lowConfidenceWithOperationalMapping: PersonalIntelligenceClassification = {
      ...usefulClassification,
      wasteLabel: 'low-confidence',
      wasteRatio: 'medium',
      nexusMappings: ['agentic_thinking', 'waste_register'],
      memoryCandidates: [],
      taskCandidates: [],
    };

    const note = buildNexusMappingNote({
      noteName: 'phase-1c-low-confidence-waste',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: lowConfidenceWithOperationalMapping,
    });

    expect(note.destination).toBe('waste_register');
    expect(note.risk).toContain('Accidentally operationalizing waste');
  });

  it('redacts sensitive source metadata and summary text before rendering', () => {
    const note = buildNexusMappingNote({
      noteName: 'phase-1c-redaction-note',
      generatedAt: '2026-05-25T13:00:00.000Z',
      classification: {
        ...usefulClassification,
        id: 'manual:founder@example.com?token=SECRET123',
        creatorOrAuthor: 'Founder founder@example.com',
        title: 'AI agent CRM SEO GEO AEO workflow for founder@example.com',
        summary: 'Use api_key: SECRET123 for founder@example.com CRM workflow.',
        insights: [
          {
            claim: 'Use api_key: SECRET123 for founder@example.com CRM workflow.',
            whyItMatters: 'Sensitive source should be redacted.',
            confidence: 'high',
            nexusMappings: ['crm'],
          },
        ],
      },
    });

    const serialized = JSON.stringify(note);
    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
  });

  it('rejects externally supplied classifications that claim raw transcript storage', () => {
    const unsafeClassification: PersonalIntelligenceClassification = {
      ...usefulClassification,
      rawTranscriptStored: true,
    };

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'raw-transcript-stored-rejected',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: unsafeClassification,
      }),
    ).toThrow('classification.rawTranscriptStored must be false');

    expect(() =>
      buildNexusMappingNote({
        noteName: 'raw-transcript-stored-rejected',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: unsafeClassification,
      }),
    ).toThrow('classification.rawTranscriptStored must be false');
  });

  it('validates parsed input before generating a note', () => {
    expect(() =>
      validateNexusMappingNoteInput({ generatedAt: '2026-05-25T13:00:00.000Z', classification: usefulClassification }),
    ).toThrow('noteName is required');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'bad',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, wasteLabel: 'bad' },
      }),
    ).toThrow('classification.wasteLabel must be supported');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'missing-arrays',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, taskCandidates: undefined },
      }),
    ).toThrow('classification.taskCandidates must be an array');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'missing-relevance',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, relevanceScores: {} },
      }),
    ).toThrow('classification.relevanceScores.total must be a number');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'bad-memory',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, memoryCandidates: [{ proposedMemory: 'missing required fields', approvalRequired: true }] },
      }),
    ).toThrow('classification.memoryCandidates[0] must include proposedMemory, memoryType, durabilityReason, and approvalRequired');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'bad-task',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, taskCandidates: [{ title: 'missing required fields', smallestNextAction: 'draft', approvalRequired: false }] },
      }),
    ).toThrow('classification.taskCandidates[0] must include title, lane, smallestNextAction, verification, and approvalRequired');

    expect(() =>
      validateNexusMappingNoteInput({
        noteName: 'bad-topic',
        generatedAt: '2026-05-25T13:00:00.000Z',
        classification: { ...usefulClassification, topicTags: ['unsupported'] },
      }),
    ).toThrow('classification.topicTags must contain supported tags');
  });
});
