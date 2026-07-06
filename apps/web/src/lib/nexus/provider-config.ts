// src/lib/nexus/provider-config.ts
// Nexus cost/capability matrix — the provider-selection matrix for the Nexus router.
// All costs are USD per 1M tokens.
//
// Anthropic-first mandate (Wave 2): the retired non-Anthropic fallback lanes
// (older GPT and Gemini models) have been removed. Nexus now routes exclusively
// across the two Claude tiers defined in the SSOT (src/lib/anthropic/models.ts):
//   high complexity   → Sonnet 5
//   medium/low        → Haiku 4.5

import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'

export type NexusProvider = 'claude'

// Model IDs mirror the SSOT registry — src/lib/anthropic/models.ts is the source of truth.
export type NexusModel =
  | typeof ANTHROPIC_MODELS.SONNET // claude-sonnet-5
  | typeof ANTHROPIC_MODELS.HAIKU  // claude-haiku-4-5-20251001

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
 * Keep entries current; scores reflect public benchmarks (Jul 2026).
 */
export const PROVIDER_MATRIX: ProviderModelSpec[] = [
  {
    provider: 'claude',
    model: ANTHROPIC_MODELS.SONNET,
    // Sonnet 5 introductory pricing through 2026-08-31 ($3 / $15 from 2026-09-01).
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 10.0,
    capabilityScore: 95,
    contextWindow: 1_000_000,
    description: 'Claude Sonnet 5 — highest capability for complex reasoning and nuanced tasks',
  },
  {
    provider: 'claude',
    model: ANTHROPIC_MODELS.HAIKU,
    inputCostPer1MTokens: 1.0,
    outputCostPer1MTokens: 5.0,
    capabilityScore: 70,
    contextWindow: 200_000,
    description: 'Claude Haiku 4.5 — fast and cost-efficient for medium/low-complexity work',
  },
]

/** Complexity tiers used by the routing algorithm. */
export type ComplexityTier = 'high' | 'medium' | 'low'

/**
 * Numeric complexity (0–100) → tier bucketing.
 * - 70–100 → high   (Claude Sonnet 5)
 * - 40–69  → medium (Claude Haiku 4.5)
 * -  0–39  → low    (Claude Haiku 4.5)
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
