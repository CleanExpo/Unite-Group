import type {
  ContentItemInput,
  NexusMapping,
  PersonalIntelligenceClassification,
  PrivacyClass,
  RelevanceScores,
  TopicTag,
  WasteLabel,
} from './types';

import { redactSensitiveText } from './redaction';

const clampScore = (value: number): number => Math.max(0, Math.min(3, value));

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const redactOptionalText = (value: string | undefined): string | undefined => (
  value === undefined ? undefined : redactSensitiveText(value)
);

const summarizeInput = (input: ContentItemInput): string => {
  if (input.summary?.trim()) return redactSensitiveText(input.summary.trim());
  return `${redactSensitiveText(input.title)} — distilled summary required before storage or routing.`;
};

const haystackFor = (input: ContentItemInput): string =>
  [input.title, input.creatorOrAuthor, input.summary]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const hasAny = (haystack: string, terms: string[]): boolean => terms.some((term) => haystack.includes(term));

export function inferTopicTags(input: ContentItemInput): TopicTag[] {
  const text = haystackFor(input);
  const tags: TopicTag[] = [];

  if (hasAny(text, ['model release', 'gpt', 'claude', 'gemini', 'llm', 'language model', 'frontier model'])) {
    tags.push('ai_models');
  }
  if (hasAny(text, ['ai agent', 'agentic', 'autonomous agent', 'multi-agent', 'workflow agent'])) {
    tags.push('ai_agents');
  }
  if (hasAny(text, ['25 moves', 'steps ahead', 'scenario planning', 'decision tree', 'long-horizon', 'long horizon'])) {
    tags.push('agentic_thinking');
  }
  if (hasAny(text, ['seo', 'search engine optimization', 'organic traffic'])) {
    tags.push('seo');
  }
  if (hasAny(text, ['geo', 'generative engine optimization', 'ai search', 'answer engines'])) {
    tags.push('geo');
  }
  if (hasAny(text, ['aeo', 'answer engine optimization', 'featured answer'])) {
    tags.push('aeo');
  }
  if (hasAny(text, ['content strategy', 'authority content', 'topical authority', 'content brief'])) {
    tags.push('content_strategy');
  }
  if (hasAny(text, ['crm', 'lead', 'pipeline', 'sales', 'conversion', 'customer relationship'])) {
    tags.push('crm_sales');
  }
  if (hasAny(text, ['saas', 'platform', 'product roadmap', 'subscription'])) {
    tags.push('saas_platform');
  }
  if (hasAny(text, ['operations', 'delivery', 'project management', 'process', 'chief of staff'])) {
    tags.push('operations_delivery');
  }
  if (hasAny(text, ['automation', 'integration', 'api', 'connector', 'zapier', 'workflow'])) {
    tags.push('automation_integration');
  }
  if (hasAny(text, ['$2b', 'valuation', 'revenue', 'margin', 'pricing', 'business model'])) {
    tags.push('finance_business_model');
  }
  if (hasAny(text, ['founder', 'entrepreneur', 'leadership', 'elon', 'strategy', 'decision'])) {
    tags.push('leadership_founder');
  }
  if (hasAny(text, ['client', 'retention', 'service delivery', 'customer outcome'])) {
    tags.push('client_service');
  }
  if (hasAny(text, ['privacy', 'security', 'compliance', 'pii', 'secret'])) {
    tags.push('security_privacy');
  }
  if (input.consumedForDowntime || hasAny(text, ['comedy', 'movie', 'gaming', 'music video', 'football highlights'])) {
    tags.push('entertainment_personal');
  }

  return unique(tags);
}

function mapToNexus(tags: TopicTag[], wasteLabel: WasteLabel): NexusMapping[] {
  const mappings: NexusMapping[] = [];

  if (wasteLabel === 'low-confidence') {
    return ['waste_register', 'parked_research'];
  }

  if (tags.some((tag) => ['seo', 'geo', 'aeo', 'content_strategy'].includes(tag))) {
    mappings.push('marketing_strategy');
  }
  if (tags.some((tag) => ['ai_models', 'ai_agents', 'automation_integration', 'security_privacy'].includes(tag))) {
    mappings.push('ai_enhancement_pipeline');
  }
  if (tags.some((tag) => ['agentic_thinking', 'leadership_founder', 'finance_business_model'].includes(tag))) {
    mappings.push('agentic_thinking');
  }
  if (tags.some((tag) => ['crm_sales', 'client_service'].includes(tag))) {
    mappings.push('crm', 'client_2nd_brain');
  }
  if (tags.some((tag) => ['saas_platform', 'operations_delivery'].includes(tag))) {
    mappings.push('product_roadmap', 'project_portfolio');
  }
  if (['duplicate', 'hype', 'entertainment', 'off-strategy', 'reject'].includes(wasteLabel)) {
    mappings.push('waste_register');
  }
  if (wasteLabel === 'parked') {
    mappings.push('parked_research');
  }

  return unique(mappings);
}

function inferWasteLabel(input: ContentItemInput, tags: TopicTag[]): WasteLabel {
  const text = haystackFor(input);

  if (input.alreadyKnown) return 'duplicate';
  if (input.consumedForDowntime || (tags.length === 1 && tags.includes('entertainment_personal'))) return 'entertainment';
  if (hasAny(text, ['guaranteed', 'secret hack', 'this changes everything', 'you will be rich', '10x overnight'])) return 'hype';
  if (tags.length === 0) return 'reject';
  if (tags.includes('entertainment_personal') && tags.length <= 2) return 'mixed';
  if (hasAny(text, ['maybe', 'rumor', 'unconfirmed', 'leak'])) return 'low-confidence';

  const strategicTags = tags.filter((tag) => tag !== 'entertainment_personal');
  if (strategicTags.length >= 3) return 'useful';
  return 'mixed';
}

function score(input: ContentItemInput, tags: TopicTag[], wasteLabel: WasteLabel): RelevanceScores {
  const isWaste = ['reject', 'entertainment', 'duplicate', 'low-confidence'].includes(wasteLabel);
  const revenue = isWaste ? 0 : clampScore(
    (tags.includes('crm_sales') ? 2 : 0) +
      (tags.includes('seo') || tags.includes('geo') || tags.includes('aeo') ? 2 : 0) +
      (tags.includes('content_strategy') ? 1 : 0) +
      (tags.includes('finance_business_model') ? 1 : 0),
  );
  const operating = isWaste ? 0 : clampScore(
    (tags.includes('ai_agents') ? 2 : 0) +
      (tags.includes('automation_integration') ? 1 : 0) +
      (tags.includes('operations_delivery') ? 1 : 0) +
      (tags.includes('content_strategy') ? 1 : 0),
  );
  const data = isWaste ? 0 : clampScore(
    (tags.includes('ai_models') ? 1 : 0) +
      (tags.includes('security_privacy') ? 1 : 0) +
      (tags.includes('agentic_thinking') ? 1 : 0) +
      (tags.includes('geo') || tags.includes('aeo') ? 1 : 0) +
      (tags.includes('content_strategy') ? 1 : 0),
  );
  const client = isWaste ? 0 : clampScore(
    (tags.includes('client_service') ? 2 : 0) +
      (tags.includes('crm_sales') ? 1 : 0) +
      (tags.includes('content_strategy') ? 1 : 0) +
      (tags.includes('seo') || tags.includes('geo') || tags.includes('aeo') ? 1 : 0),
  );
  const strategic = isWaste ? 0 : clampScore(
    (tags.includes('agentic_thinking') ? 2 : 0) +
      (tags.includes('saas_platform') ? 1 : 0) +
      (tags.includes('finance_business_model') ? 1 : 0) +
      (tags.includes('ai_agents') ? 1 : 0) +
      (tags.includes('ai_models') ? 1 : 0) +
      (tags.includes('geo') || tags.includes('aeo') ? 1 : 0),
  );
  const actionability = isWaste ? 0 : clampScore(
    hasAny(haystackFor(input), ['implement', 'build', 'template', 'checklist', 'framework', 'test', 'workflow']) ? 3 : 1,
  );
  const confidence = wasteLabel === 'low-confidence' || wasteLabel === 'hype' ? 1 : wasteLabel === 'useful' ? 3 : 2;
  const total = revenue + operating + data + client + strategic + actionability + confidence;

  return { revenue, operating, data, client, strategic, actionability, confidence, total };
}

const inferPrivacy = (input: ContentItemInput): PrivacyClass => {
  if (input.privacyClass) return input.privacyClass;

  if (input.sourceType === 'youtube' || input.sourceType === 'podcast' || input.sourceType === 'article') {
    return 'public';
  }

  return 'personal';
};

export function classifyContentItem(input: ContentItemInput): PersonalIntelligenceClassification {
  const privacyClass = inferPrivacy(input);
  const redactedTitle = redactSensitiveText(input.title);
  const redactedId = redactOptionalText(input.id);
  const redactedSourceUrl = redactOptionalText(input.sourceUrl);
  const redactedCreatorOrAuthor = redactOptionalText(input.creatorOrAuthor);
  const summary = summarizeInput(input);
  const topicTags = inferTopicTags(input);
  const wasteLabel = inferWasteLabel(input, topicTags);
  const relevanceScores = score(input, topicTags, wasteLabel);
  const nexusMappings = mapToNexus(topicTags, wasteLabel);
  const approvalRequiredBeforeStorage = ['personal', 'client', 'sensitive'].includes(privacyClass);
  const actionable = relevanceScores.total >= 17 && !['reject', 'entertainment', 'duplicate', 'low-confidence'].includes(wasteLabel);
  const durableFounderSignal = topicTags.includes('leadership_founder') || topicTags.includes('agentic_thinking');

  const insights = actionable
    ? [
        {
          claim: summary,
          whyItMatters: 'Potentially useful signal for Nexus strategy, operations, marketing, or AI enhancement.',
          confidence: relevanceScores.confidence === 3 ? 'high' : relevanceScores.confidence === 2 ? 'medium' : 'low',
          nexusMappings,
        } as const,
      ]
    : [];

  const memoryCandidates = durableFounderSignal && wasteLabel !== 'low-confidence' && relevanceScores.total >= 8
    ? [
        {
          proposedMemory: 'Phill repeatedly values long-horizon strategic intelligence that converts learning into Nexus execution leverage.',
          memoryType: 'user_preference' as const,
          durabilityReason: 'Stable founder operating preference, not a transient content fact.',
          approvalRequired: true,
        },
      ]
    : [];

  const taskCandidates = actionable && nexusMappings.some((mapping) => mapping !== 'waste_register')
    ? [
        {
          title: `Review Nexus application of: ${redactedTitle}`,
          lane: nexusMappings.includes('marketing_strategy') ? 'marketing' as const : 'research' as const,
          smallestNextAction: 'Create a short Nexus mapping note with one experiment, one risk, and one verification step.',
          verification: 'Read back the mapping note and confirm it names the source, useful signal, waste decision, and Nexus destination.',
          approvalRequired: approvalRequiredBeforeStorage,
        },
      ]
    : [];

  const operatorNotes = [
    approvalRequiredBeforeStorage
      ? 'Approval required before storing raw/source data because the item is personal, client, or sensitive.'
      : 'Public or explicitly supplied content may be processed locally.',
    wasteLabel === 'entertainment' || wasteLabel === 'reject'
      ? 'Do not operationalize this item unless Phill explicitly marks it as strategically relevant.'
      : 'Store distilled insight only; avoid raw transcript retention by default.',
  ];

  return {
    sourceType: input.sourceType,
    id: redactedId,
    sourceUrl: redactedSourceUrl,
    creatorOrAuthor: redactedCreatorOrAuthor,
    title: redactedTitle,
    summary,
    privacyClass,
    topicTags,
    wasteLabel,
    wasteRatio: wasteLabel === 'useful' ? 'low' : wasteLabel === 'mixed' ? 'medium' : 'high',
    relevanceScores,
    nexusMappings,
    insights,
    memoryCandidates,
    taskCandidates,
    approvalRequiredBeforeStorage,
    rawTranscriptStored: false,
    operatorNotes,
  };
}
