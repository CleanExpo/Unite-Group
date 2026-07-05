// src/lib/nexus/router.ts
// Nexus AI provider router — selects the optimal provider/model based on
// work complexity, remaining token budget, and the cost/capability matrix.
//
// Decision logic (Anthropic-first — Claude-only after Wave 2):
//   high complexity   → Claude Sonnet 5 (best capability)
//   medium complexity → Claude Haiku 4.5 (balanced cost/quality)
//   low complexity    → Claude Haiku 4.5 (cheapest capable model)
//
// The budget guardrail is retained for the reasoning trail: when the remaining
// token budget is below a threshold, the router notes it downgraded to the
// cheapest capable model. Both low lanes resolve to Haiku 4.5.

import {
  type NexusProvider,
  type NexusModel,
  type ComplexityTier,
  toComplexityTier,
  PROVIDER_MATRIX,
} from './provider-config'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'

// ── Public contract ──────────────────────────────────────────────────────────

export type WorkType =
  | 'deep_reasoning'
  | 'coding'
  | 'content_generation'
  | 'summarisation'
  | 'classification'
  | 'data_extraction'
  | 'question_answering'
  | 'bulk_text'

export interface RouterInput {
  /** Semantic category of work being done. */
  workType: WorkType
  /**
   * Numeric complexity score 0–100.
   * Callers should derive this from task metadata (e.g. token count, task
   * graph depth, user-tier requirements).  The router bucketed this into
   * high / medium / low tiers internally.
   */
  complexity: number
  /**
   * Tokens still available in the current budget envelope.
   * When below BUDGET_CONSTRAINED_THRESHOLD the router prefers cheaper models.
   */
  tokenBudgetRemaining: number
}

export interface RouterResult {
  provider: NexusProvider
  model: NexusModel
  /** Human-readable explanation of the routing decision for audit / debug. */
  reasoning: string
  /** Capability score of the selected model (0–100). */
  capabilityScore: number
  /** Estimated USD cost per 1M tokens (blended input+output). */
  estimatedCostPer1MTokens: number
  /** Complexity tier derived from the numeric score. */
  complexityTier: ComplexityTier
}

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * When tokenBudgetRemaining drops below this value the router switches to
 * the cheapest capable model to protect the budget envelope.
 */
export const BUDGET_CONSTRAINED_THRESHOLD = 50_000

// ── Per-tier model assignments ───────────────────────────────────────────────

const HIGH_COMPLEXITY_MODEL: NexusModel = ANTHROPIC_MODELS.SONNET
const MEDIUM_COMPLEXITY_MODEL: NexusModel = ANTHROPIC_MODELS.HAIKU
const LOW_COMPLEXITY_UNCONSTRAINED_MODEL: NexusModel = ANTHROPIC_MODELS.HAIKU
const LOW_COMPLEXITY_CONSTRAINED_MODEL: NexusModel = ANTHROPIC_MODELS.HAIKU

// ── Router ───────────────────────────────────────────────────────────────────

/**
 * Select the optimal AI provider and model for a unit of work.
 *
 * Pure function — no I/O, no side effects.  Callers that want audit
 * persistence should pass the result to `logRoutingDecision()`.
 */
export function routeRequest(input: RouterInput): RouterResult {
  const { workType, complexity, tokenBudgetRemaining } = input

  const tier = toComplexityTier(complexity)
  const budgetConstrained = tokenBudgetRemaining < BUDGET_CONSTRAINED_THRESHOLD

  let model: NexusModel
  let reasoning: string

  switch (tier) {
    case 'high': {
      model = HIGH_COMPLEXITY_MODEL
      reasoning =
        `High-complexity task (score ${complexity}/100, tier=high, workType=${workType}). ` +
        `Routed to ${model} — highest capability score in the matrix; ` +
        `budget remaining (${tokenBudgetRemaining.toLocaleString()} tokens) is sufficient.`
      break
    }

    case 'medium': {
      model = MEDIUM_COMPLEXITY_MODEL
      reasoning =
        `Medium-complexity task (score ${complexity}/100, tier=medium, workType=${workType}). ` +
        `Routed to ${model} — balanced cost/capability; ` +
        `budget remaining ${tokenBudgetRemaining.toLocaleString()} tokens.`
      break
    }

    case 'low':
    default: {
      if (budgetConstrained) {
        model = LOW_COMPLEXITY_CONSTRAINED_MODEL
        reasoning =
          `Low-complexity task (score ${complexity}/100, tier=low, workType=${workType}) AND ` +
          `budget constrained (${tokenBudgetRemaining.toLocaleString()} tokens remaining, ` +
          `threshold=${BUDGET_CONSTRAINED_THRESHOLD.toLocaleString()}). ` +
          `Routed to ${model} — cheapest model to preserve remaining budget.`
      } else {
        model = LOW_COMPLEXITY_UNCONSTRAINED_MODEL
        reasoning =
          `Low-complexity task (score ${complexity}/100, tier=low, workType=${workType}). ` +
          `Budget sufficient (${tokenBudgetRemaining.toLocaleString()} tokens remaining, ` +
          `threshold=${BUDGET_CONSTRAINED_THRESHOLD.toLocaleString()}). ` +
          `Routed to ${model} — fast and cost-efficient.`
      }
      break
    }
  }

  const spec = PROVIDER_MATRIX.find(s => s.model === model)!
  const blendedCost =
    (spec.inputCostPer1MTokens + spec.outputCostPer1MTokens) / 2

  return {
    provider: spec.provider,
    model,
    reasoning,
    capabilityScore: spec.capabilityScore,
    estimatedCostPer1MTokens: blendedCost,
    complexityTier: tier,
  }
}
