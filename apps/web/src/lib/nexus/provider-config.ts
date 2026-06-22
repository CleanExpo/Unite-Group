// src/lib/nexus/provider-config.ts
// Nexus cost/capability matrix — single source of truth for provider selection.
// All costs are USD per 1M tokens (input + output averaged where providers differ).

export type NexusProvider = 'claude' | 'openai' | 'gemini'

export type NexusModel =
  // Claude
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001'
  // OpenAI
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-3.5-turbo'
  // Gemini
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'

export interface ProviderModelSpec {
  provider: NexusProvider
  model: NexusModel
  /** USD per 1M input tokens */
  inputCostPer1MTokens: number
  /** USD per 1M output tokens */
  outputCostPer1MTokens: number
  /** 0–100: reasoning depth, instruction following, nuance */
  capabilityScore: number
  /** Maximum context window in tokens */
  contextWindow: number
  /** Human-readable description */
  description: string
}

/**
 * Capability matrix ordered by descending capability score.
 * Keep entries current; scores reflect public benchmarks (Jun 2026).
 */
export const PROVIDER_MATRIX: ProviderModelSpec[] = [
  {
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    inputCostPer1MTokens: 3.0,
    outputCostPer1MTokens: 15.0,
    capabilityScore: 95,
    contextWindow: 200_000,
    description: 'Claude Sonnet — highest capability for complex reasoning and nuanced tasks',
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPer1MTokens: 2.5,
    outputCostPer1MTokens: 10.0,
    capabilityScore: 90,
    contextWindow: 128_000,
    description: 'GPT-4o — strong multimodal reasoning at competitive cost',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    inputCostPer1MTokens: 3.5,
    outputCostPer1MTokens: 10.5,
    capabilityScore: 85,
    contextWindow: 1_000_000,
    description: 'Gemini 1.5 Pro — best-in-class context window for document-heavy tasks',
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputCostPer1MTokens: 0.15,
    outputCostPer1MTokens: 0.6,
    capabilityScore: 70,
    contextWindow: 128_000,
    description: 'GPT-4o-mini — balanced cost/quality for medium-complexity work',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    inputCostPer1MTokens: 0.075,
    outputCostPer1MTokens: 0.3,
    capabilityScore: 60,
    contextWindow: 1_000_000,
    description: 'Gemini 1.5 Flash — fast and cheap for high-volume simple tasks',
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    inputCostPer1MTokens: 0.5,
    outputCostPer1MTokens: 1.5,
    capabilityScore: 50,
    contextWindow: 16_385,
    description: 'GPT-3.5-turbo — budget-constrained fallback for low-complexity tasks',
  },
]

/** Complexity tiers used by the routing algorithm. */
export type ComplexityTier = 'high' | 'medium' | 'low'

/**
 * Numeric complexity (0–100) → tier bucketing.
 * - 70–100 → high   (Claude Sonnet)
 * - 40–69  → medium (GPT-4o-mini)
 * -  0–39  → low    (GPT-3.5 when budget constrained)
 */
export function toComplexityTier(complexity: number): ComplexityTier {
  if (complexity >= 70) return 'high'
  if (complexity >= 40) return 'medium'
  return 'low'
}

/** Look up a model spec by model id. */
export function getModelSpec(model: NexusModel): ProviderModelSpec {
  const spec = PROVIDER_MATRIX.find(s => s.model === model)
  if (!spec) throw new Error(`Unknown model: ${model}`)
  return spec
}

/**
 * Estimated USD cost for a single call given token counts.
 * Uses the spec's input/output per-1M rates.
 */
export function estimateCallCost(
  model: NexusModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const spec = getModelSpec(model)
  return (
    (inputTokens / 1_000_000) * spec.inputCostPer1MTokens +
    (outputTokens / 1_000_000) * spec.outputCostPer1MTokens
  )
}
