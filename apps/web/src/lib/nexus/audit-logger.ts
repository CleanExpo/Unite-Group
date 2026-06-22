// src/lib/nexus/audit-logger.ts
// Persists routing decisions to the nexus_routing_audit table.
// Uses the service-role Supabase client so RLS does not block writes.

import { createServiceClient, hasSupabaseServiceConfig } from '@/lib/supabase/service'
import type { RouterInput, RouterResult } from './router'

export interface RoutingAuditRow {
  work_type: string
  complexity: number
  complexity_tier: string
  token_budget_remaining: number
  selected_provider: string
  selected_model: string
  capability_score: number
  estimated_cost_per_1m_tokens: number
  reasoning: string
  /** ISO timestamp — set by the caller (keeps this function pure for tests). */
  decided_at: string
}

/**
 * Write a routing decision to nexus_routing_audit.
 *
 * No-op (with console.warn) when the Supabase env vars are absent so that
 * unit tests and local development don't require a live database.
 */
export async function logRoutingDecision(
  input: RouterInput,
  result: RouterResult,
  decidedAt: string,
): Promise<void> {
  if (!hasSupabaseServiceConfig()) {
    // Silently skip in test / local environments.
    return
  }

  const client = createServiceClient()

  const row: RoutingAuditRow = {
    work_type: input.workType,
    complexity: input.complexity,
    complexity_tier: result.complexityTier,
    token_budget_remaining: input.tokenBudgetRemaining,
    selected_provider: result.provider,
    selected_model: result.model,
    capability_score: result.capabilityScore,
    estimated_cost_per_1m_tokens: result.estimatedCostPer1MTokens,
    reasoning: result.reasoning,
    decided_at: decidedAt,
  }

  const { error } = await client.from('nexus_routing_audit').insert(row)

  if (error) {
    console.warn('[nexus/audit-logger] Failed to persist routing decision:', error.message)
  }
}
