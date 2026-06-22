import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeRequest, type RouterInput } from '../router'

const serviceMocks = vi.hoisted(() => ({
  hasSupabaseServiceConfig: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: serviceMocks.hasSupabaseServiceConfig,
  createServiceClient: serviceMocks.createServiceClient,
}))

import { logRoutingDecision } from '../audit-logger'

const input: RouterInput = {
  workType: 'coding',
  complexity: 82,
  tokenBudgetRemaining: 125_000,
}

const result = routeRequest(input)
const decidedAt = '2026-06-22T09:45:00.000Z'

describe('logRoutingDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.insert.mockResolvedValue({ error: null })
    serviceMocks.from.mockReturnValue({ insert: serviceMocks.insert })
    serviceMocks.createServiceClient.mockReturnValue({ from: serviceMocks.from })
  })

  it('skips audit persistence when Supabase service config is unavailable', async () => {
    serviceMocks.hasSupabaseServiceConfig.mockReturnValue(false)

    await logRoutingDecision(input, result, decidedAt)

    expect(serviceMocks.hasSupabaseServiceConfig).toHaveBeenCalledOnce()
    expect(serviceMocks.createServiceClient).not.toHaveBeenCalled()
    expect(serviceMocks.from).not.toHaveBeenCalled()
    expect(serviceMocks.insert).not.toHaveBeenCalled()
  })

  it('persists routing decisions through the central service-role client helper', async () => {
    serviceMocks.hasSupabaseServiceConfig.mockReturnValue(true)

    await logRoutingDecision(input, result, decidedAt)

    expect(serviceMocks.createServiceClient).toHaveBeenCalledOnce()
    expect(serviceMocks.from).toHaveBeenCalledWith('nexus_routing_audit')
    expect(serviceMocks.insert).toHaveBeenCalledWith({
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
    })
  })
})
