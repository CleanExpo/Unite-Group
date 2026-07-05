/**
 * Anthropic Model Constants — SINGLE SOURCE OF TRUTH (SSOT)
 *
 * This is the ONLY definition point for Anthropic model IDs in apps/web.
 * Every other module (ai/types.ts, nexus, capabilities, command-centre lanes,
 * coaches, ceo-board, campaigns, advisory, strategy, etc.) imports from here.
 * packages/shared/src/types/models.ts mirrors these values (no cross-package
 * import path exists) and names this file as the source of truth.
 *
 * Last updated: 2026-07-05 (Wave 2 model-upgrade program)
 * @see https://docs.anthropic.com/en/docs/models-overview
 */

export const ANTHROPIC_MODELS = {
  // ─── CURRENT GENERATION (default for Nexus) ─────────────────────────
  // These are the standard models for all Unite-Hub AI features.

  // Claude Opus 4.8 — deep thinking, complex reasoning, strategic analysis.
  // Adaptive thinking only (budget_tokens / temperature return 400).
  OPUS: 'claude-opus-4-8',
  OPUS_4: 'claude-opus-4-8',

  // Claude Sonnet 5 — balanced capability and speed; execution workhorse.
  // Adaptive thinking on by default; sampling params return 400.
  SONNET: 'claude-sonnet-5',
  SONNET_4: 'claude-sonnet-5',

  // Claude Haiku 4.5 — fast, cost-effective (still current gen; NOT a 4.7+
  // model, so temperature is accepted here).
  HAIKU: 'claude-haiku-4-5-20251001',
  HAIKU_4: 'claude-haiku-4-5-20251001',

  // ─── FULL MODEL IDs (for precise pinning) ──────────────────────────
  OPUS_4_8: 'claude-opus-4-8',
  SONNET_5: 'claude-sonnet-5',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Model routing for Nexus features
 *
 * Maps feature → model. Optimises for cost/quality trade-off.
 */
export const NEXUS_AI_ROUTING = {
  // Block editor AI
  'editor.autocomplete': ANTHROPIC_MODELS.HAIKU,      // Fast, cheap — inline completions
  'editor.expand': ANTHROPIC_MODELS.SONNET,            // Good quality writing
  'editor.rewrite': ANTHROPIC_MODELS.SONNET,           // Rewriting/improving text
  'editor.summarize': ANTHROPIC_MODELS.HAIKU,          // Quick summaries
  'editor.translate': ANTHROPIC_MODELS.HAIKU,          // Translation

  // Database AI
  'database.autofill': ANTHROPIC_MODELS.HAIKU,         // Fill empty cells
  'database.analyze': ANTHROPIC_MODELS.SONNET,         // Analyze trends
  'database.formula': ANTHROPIC_MODELS.SONNET,         // Generate formulas

  // Chat / Assistant
  'chat.general': ANTHROPIC_MODELS.SONNET,             // General chat
  'chat.strategy': ANTHROPIC_MODELS.OPUS,              // Business strategy
  'chat.code': ANTHROPIC_MODELS.OPUS,                  // Code generation

  // Search & Navigation
  'search.semantic': ANTHROPIC_MODELS.HAIKU,           // Search queries
  'search.answer': ANTHROPIC_MODELS.SONNET,            // Answer questions

  // Business Intelligence
  'intel.report': ANTHROPIC_MODELS.OPUS,               // Generate reports
  'intel.forecast': ANTHROPIC_MODELS.SONNET,           // Revenue forecasting
  'intel.insight': ANTHROPIC_MODELS.SONNET,            // Business insights
} as const;

export type AnthropicModelName = typeof ANTHROPIC_MODELS[keyof typeof ANTHROPIC_MODELS];

/**
 * Model pricing per million tokens (USD). Official prices.
 */
export const MODEL_PRICING = {
  [ANTHROPIC_MODELS.OPUS]: { input: 5, output: 25 },
  // Sonnet 5 introductory pricing runs through 2026-08-31.
  // From 2026-09-01 the standard rate is { input: 3, output: 15 }.
  [ANTHROPIC_MODELS.SONNET]: { input: 2, output: 10 },
  [ANTHROPIC_MODELS.HAIKU]: { input: 1, output: 5 },
} as const;

/**
 * Model capabilities
 */
export const MODEL_CAPABILITIES = {
  [ANTHROPIC_MODELS.OPUS]: {
    extendedThinking: true,
    promptCaching: true,
    vision: true,
    maxTokens: 1_000_000,
    outputTokens: 128_000,
  },
  [ANTHROPIC_MODELS.SONNET]: {
    extendedThinking: true,
    promptCaching: true,
    vision: true,
    maxTokens: 1_000_000,
    outputTokens: 128_000,
  },
  [ANTHROPIC_MODELS.HAIKU]: {
    extendedThinking: false,
    promptCaching: true,
    vision: true,
    maxTokens: 200_000,
    outputTokens: 64_000,
  },
} as const;

/**
 * Validate if a model name is valid
 */
export function isValidModel(model: string): model is AnthropicModelName {
  return Object.values(ANTHROPIC_MODELS).includes(model as AnthropicModelName);
}

/**
 * Get model pricing
 */
export function getModelPricing(model: string) {
  if (!(model in MODEL_PRICING)) {
    console.warn(`Unknown model: ${model}, using Sonnet pricing as fallback`);
    return MODEL_PRICING[ANTHROPIC_MODELS.SONNET];
  }
  return MODEL_PRICING[model as keyof typeof MODEL_PRICING];
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(model: string) {
  if (!(model in MODEL_CAPABILITIES)) {
    console.warn(`Unknown model: ${model}, using Sonnet capabilities as fallback`);
    return MODEL_CAPABILITIES[ANTHROPIC_MODELS.SONNET];
  }
  return MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES];
}

/**
 * Recommended models for specific use cases
 */
export const RECOMMENDED_MODELS = {
  // For extended thinking tasks
  DEEP_ANALYSIS: ANTHROPIC_MODELS.OPUS,

  // For balanced performance
  STANDARD: ANTHROPIC_MODELS.SONNET,

  // For fast, simple tasks
  QUICK: ANTHROPIC_MODELS.HAIKU,

  // For cost-sensitive operations
  COST_EFFECTIVE: ANTHROPIC_MODELS.HAIKU,
} as const;
