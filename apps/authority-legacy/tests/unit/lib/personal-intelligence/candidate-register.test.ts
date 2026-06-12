import {
  buildCandidateRegisterBatch,
  candidateRegisterOutputBaseName,
  renderCandidateRegisterMarkdown,
  validateCandidateRegisterPromotionInput,
} from '@/lib/personal-intelligence/candidate-register';
import type { PersonalIntelligenceClassification } from '@/lib/personal-intelligence/types';

const usefulClassification: PersonalIntelligenceClassification = {
  id: 'youtube:https://www.youtube.com/watch?v=phase1d001',
  sourceType: 'youtube',
  sourceUrl: 'https://www.youtube.com/watch?v=phase1d001',
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
      title: 'Review Nexus application of AI agents for SEO GEO AEO CRM and 25 steps ahead planning',
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

describe('buildCandidateRegisterBatch', () => {
  it('promotes note-derived memory, task, and experiment candidates into a local structured register batch', () => {
    const batch = buildCandidateRegisterBatch({
      generatedAt: '2026-05-25T14:00:00.000Z',
      sourceNotePath:
        'docs/margot/personal-intelligence/nexus-mapping-notes/2026-05-25-phase-1d-useful-note.md',
      classification: usefulClassification,
    });

    expect(batch.generatedAt).toBe('2026-05-25T14:00:00.000Z');
    expect(batch.sourceNotePath).toBe(
      'docs/margot/personal-intelligence/nexus-mapping-notes/2026-05-25-phase-1d-useful-note.md',
    );
    expect(batch.entries).toHaveLength(3);

    const memory = batch.entries.find((entry) => entry.candidateType === 'memory');
    expect(memory).toMatchObject({
      approvalStatus: 'needs_approval',
      nexusDestination: 'memory_candidate',
      sourceNotePath: batch.sourceNotePath,
      smallestNextAction: 'Review and explicitly approve or reject this memory proposal before durable storage.',
      verificationStep: 'Confirm the memory is distilled, durable, non-raw, and explicitly approved before saving.',
    });
    expect(memory?.candidateId).toBe('phase-1d001-memory-1');
    expect(memory?.retentionPrivacyGuardrails).toContain('proposal only');

    const task = batch.entries.find((entry) => entry.candidateType === 'task');
    expect(task).toMatchObject({
      approvalStatus: 'draft',
      nexusDestination: 'task_candidate',
      smallestNextAction: 'Create a short Nexus mapping note with one experiment, one risk, and one verification step.',
      verificationStep: 'Read back the mapping note and confirm source, signal, waste decision, and destination.',
    });
    expect(task?.candidateId).toBe('phase-1d001-task-1');

    const experiment = batch.entries.find((entry) => entry.candidateType === 'experiment');
    expect(experiment).toMatchObject({
      approvalStatus: 'needs_approval',
      nexusDestination: 'marketing_strategy',
      smallestNextAction:
        'Create one local marketing_strategy draft experiment from the distilled signal; do not deploy or publish it.',
      verificationStep: 'Read back the draft and confirm source, useful signal, waste decision, and approval state.',
    });
  });

  it('keeps waste-labeled notes as waste-register evidence without operational candidates', () => {
    const batch = buildCandidateRegisterBatch({
      generatedAt: '2026-05-25T14:00:00.000Z',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/waste-note.md',
      classification: {
        ...usefulClassification,
        id: 'manual:waste-example',
        title: 'Football highlights and generic model hype',
        summary: 'Downtime and hype content with no Nexus action.',
        privacyClass: 'public',
        topicTags: ['entertainment_personal'],
        wasteLabel: 'low-confidence',
        wasteRatio: 'high',
        relevanceScores: { revenue: 0, operating: 0, data: 0, client: 0, strategic: 0, actionability: 0, confidence: 1, total: 1 },
        nexusMappings: ['agentic_thinking', 'waste_register'],
        insights: [],
        memoryCandidates: usefulClassification.memoryCandidates,
        taskCandidates: usefulClassification.taskCandidates,
      },
    });

    expect(batch.entries).toHaveLength(1);
    expect(batch.entries[0]).toMatchObject({
      candidateType: 'waste',
      approvalStatus: 'rejected',
      nexusDestination: 'waste_register',
      smallestNextAction: 'Retain only as waste-register evidence; do not operationalize.',
    });
    expect(JSON.stringify(batch.entries)).not.toContain('task_candidate');
    expect(JSON.stringify(batch.entries)).not.toContain('memory_candidate');
    expect(JSON.stringify(batch.entries)).not.toContain('agentic_thinking');
  });

  it('redacts sensitive fields before serializing register JSON or Markdown', () => {
    const batch = buildCandidateRegisterBatch({
      generatedAt: '2026-05-25T14:00:00.000Z',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/private-note.md',
      classification: {
        ...usefulClassification,
        id: 'manual:founder@example.com?token=SECRET123',
        title: 'Private CRM note for founder@example.com using api_key: SECRET123',
        summary: 'Private CRM note for founder@example.com using api_key: SECRET123.',
        privacyClass: 'sensitive',
        approvalRequiredBeforeStorage: false,
        memoryCandidates: [
          {
            proposedMemory: 'Founder founder@example.com uses api_key: SECRET123 for CRM.',
            memoryType: 'user_preference',
            durabilityReason: 'Contains private operational detail for founder@example.com.',
            approvalRequired: false,
          },
        ],
      },
    });
    const markdown = renderCandidateRegisterMarkdown(batch);
    const serialized = `${JSON.stringify(batch)}\n${markdown}`;

    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
    expect(serialized).not.toContain('founder@example.com');
    expect(serialized).not.toContain('SECRET123');
    expect(batch.entries.every((entry) => entry.approvalStatus === 'needs_approval')).toBe(true);
  });

  it('validates parsed promotion input before building a register batch', () => {
    expect(() => validateCandidateRegisterPromotionInput({ generatedAt: '2026-05-25T14:00:00.000Z' })).toThrow(
      'sourceNotePath is required',
    );

    expect(() =>
      validateCandidateRegisterPromotionInput({
        generatedAt: '2026-05-25T14:00:00.000Z',
        sourceNotePath: '../outside.md',
        classification: usefulClassification,
      }),
    ).toThrow('sourceNotePath must stay under docs/margot/personal-intelligence/nexus-mapping-notes');

    expect(() =>
      validateCandidateRegisterPromotionInput({
        generatedAt: '2026-05-25T14:00:00.000Z',
        sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/bad.md',
        classification: { ...usefulClassification, taskCandidates: [{ title: 'missing fields' }] },
      }),
    ).toThrow('classification.taskCandidates[0] must include title, lane, smallestNextAction, verification, and approvalRequired');

    expect(() =>
      validateCandidateRegisterPromotionInput({
        generatedAt: '2026-05-25T14:00:00.000Z',
        sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/bad-id.md',
        classification: { ...usefulClassification, id: 123 },
      }),
    ).toThrow('classification.id must be a string when supplied');

    expect(() =>
      validateCandidateRegisterPromotionInput({
        generatedAt: '2026-05-25T14:00:00.000Z',
        sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/raw-stored.md',
        classification: { ...usefulClassification, rawTranscriptStored: true },
      }),
    ).toThrow('classification.rawTranscriptStored must be false');
  });

  it('sanitizes filesystem output basenames and escapes Markdown table cells', () => {
    expect(
      candidateRegisterOutputBaseName(
        'docs/margot/personal-intelligence/nexus-mapping-notes/founder@example.com-token=SECRET123.md',
      ),
    ).toBe('redacted-email-redacted-secret');

    const batch = buildCandidateRegisterBatch({
      generatedAt: '2026-05-25T14:00:00.000Z',
      sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/pipe-note.md',
      classification: {
        ...usefulClassification,
        taskCandidates: [
          {
            ...usefulClassification.taskCandidates[0],
            title: 'Task with | pipe and\nnewline',
            smallestNextAction: 'Draft | verify\nread-back',
            verification: 'Confirm | escaped\ntext',
          },
        ],
      },
    });

    const markdown = renderCandidateRegisterMarkdown(batch);
    expect(markdown).toContain('Task with \\| pipe and newline');
    expect(markdown).toContain('Draft \\| verify read-back');
    expect(markdown).toContain('Confirm \\| escaped text');
  });
});
