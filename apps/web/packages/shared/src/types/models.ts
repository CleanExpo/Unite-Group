// AI Model types
export type ModelProvider = 'anthropic' | 'google' | 'openrouter';
export type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'pro';

export interface ModelConfig {
  provider: ModelProvider;
  tier: ModelTier;
  maxTokens?: number;
  temperature?: number;
}

// Model identifiers
// Values are kept in sync with the SSOT registry at
// apps/web/src/lib/anthropic/models.ts (the single definition point for
// Anthropic model IDs in apps/web). No cross-package import path exists, so
// these literals are mirrored by hand — update both when models change.
export const MODELS = {
  anthropic: {
    opus: 'claude-opus-4-8',
    sonnet: 'claude-sonnet-5',
    haiku: 'claude-haiku-4-5-20251001',
  },
  google: {
    pro: 'gemini-2.0-flash-exp',
  },
  openrouter: {
    opus: 'anthropic/claude-opus-4-8',
    sonnet: 'anthropic/claude-sonnet-5',
    pro: 'google/gemini-2.0-flash-exp',
  },
} as const;

// Skill types
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  priority: number;
  triggers: string[];
  requires: string[];
}

export interface Skill extends SkillMetadata {
  content: string;
  path: string;
}
