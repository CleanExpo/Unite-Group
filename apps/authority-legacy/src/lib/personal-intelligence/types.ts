export type ContentSourceType =
  | 'youtube'
  | 'podcast'
  | 'audiobook'
  | 'search'
  | 'article'
  | 'newsletter'
  | 'voice'
  | 'chat'
  | 'export'
  | 'manual';

export type PrivacyClass = 'public' | 'personal' | 'client' | 'sensitive';

export type WasteLabel =
  | 'useful'
  | 'mixed'
  | 'duplicate'
  | 'hype'
  | 'entertainment'
  | 'off-strategy'
  | 'low-confidence'
  | 'parked'
  | 'reject';

export type TopicTag =
  | 'ai_models'
  | 'ai_agents'
  | 'agentic_thinking'
  | 'seo'
  | 'geo'
  | 'aeo'
  | 'content_strategy'
  | 'crm_sales'
  | 'saas_platform'
  | 'operations_delivery'
  | 'automation_integration'
  | 'finance_business_model'
  | 'leadership_founder'
  | 'client_service'
  | 'security_privacy'
  | 'entertainment_personal';

export type NexusMapping =
  | 'crm'
  | 'client_2nd_brain'
  | 'marketing_strategy'
  | 'ai_enhancement_pipeline'
  | 'agentic_thinking'
  | 'product_roadmap'
  | 'project_portfolio'
  | 'memory_candidate'
  | 'task_candidate'
  | 'parked_research'
  | 'waste_register';

export interface ContentItemInput {
  id?: string;
  sourceType: ContentSourceType;
  sourceUrl?: string;
  title: string;
  creatorOrAuthor?: string;
  summary?: string;
  transcriptExcerpt?: string;
  notes?: string;
  privacyClass?: PrivacyClass;
  alreadyKnown?: boolean;
  consumedForDowntime?: boolean;
  capturedAt?: string;
}

export interface RelevanceScores {
  revenue: number;
  operating: number;
  data: number;
  client: number;
  strategic: number;
  actionability: number;
  confidence: number;
  total: number;
}

export interface InsightCandidate {
  claim: string;
  whyItMatters: string;
  confidence: 'low' | 'medium' | 'high';
  nexusMappings: NexusMapping[];
}

export interface MemoryCandidate {
  proposedMemory: string;
  memoryType: 'user_preference' | 'business_thesis' | 'operating_rule' | 'project_convention';
  durabilityReason: string;
  approvalRequired: boolean;
}

export interface TaskCandidate {
  title: string;
  lane: 'docs' | 'research' | 'implementation' | 'test' | 'marketing' | 'crm' | 'product' | 'automation';
  smallestNextAction: string;
  verification: string;
  approvalRequired: boolean;
}

export interface PersonalIntelligenceClassification {
  id?: string;
  sourceType: ContentSourceType;
  sourceUrl?: string;
  creatorOrAuthor?: string;
  title: string;
  summary: string;
  privacyClass: PrivacyClass;
  topicTags: TopicTag[];
  wasteLabel: WasteLabel;
  wasteRatio: 'low' | 'medium' | 'high';
  relevanceScores: RelevanceScores;
  nexusMappings: NexusMapping[];
  insights: InsightCandidate[];
  memoryCandidates: MemoryCandidate[];
  taskCandidates: TaskCandidate[];
  approvalRequiredBeforeStorage: boolean;
  rawTranscriptStored: false;
  operatorNotes: string[];
}
