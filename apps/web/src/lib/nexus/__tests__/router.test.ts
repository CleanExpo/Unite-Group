import { describe, it, expect } from 'vitest'
import { routeRequest, BUDGET_CONSTRAINED_THRESHOLD } from '../router'

// Budget values used across tests
const AMPLE_BUDGET = BUDGET_CONSTRAINED_THRESHOLD + 100_000
const TIGHT_BUDGET = BUDGET_CONSTRAINED_THRESHOLD - 1

describe('routeRequest — Nexus AI provider router', () => {
  // ── High complexity ────────────────────────────────────────────────────────

  it('routes high-complexity work to Claude Sonnet', () => {
    const result = routeRequest({
      workType: 'deep_reasoning',
      complexity: 85,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(result.provider).toBe('claude')
    expect(result.model).toBe('claude-sonnet-4-6')
    expect(result.complexityTier).toBe('high')
    expect(result.reasoning).toMatch(/high/i)
    expect(result.reasoning).toMatch(/claude-sonnet-4-6/)
  })

  it('routes complexity=70 (boundary) as high tier to Claude Sonnet', () => {
    const result = routeRequest({
      workType: 'coding',
      complexity: 70,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(result.complexityTier).toBe('high')
    expect(result.model).toBe('claude-sonnet-4-6')
  })

  // ── Medium complexity ──────────────────────────────────────────────────────

  it('routes medium-complexity work to GPT-4o-mini', () => {
    const result = routeRequest({
      workType: 'content_generation',
      complexity: 55,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(result.provider).toBe('openai')
    expect(result.model).toBe('gpt-4o-mini')
    expect(result.complexityTier).toBe('medium')
    expect(result.reasoning).toMatch(/medium/i)
  })

  it('routes complexity=40 (boundary) as medium tier', () => {
    const result = routeRequest({
      workType: 'summarisation',
      complexity: 40,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(result.complexityTier).toBe('medium')
    expect(result.model).toBe('gpt-4o-mini')
  })

  // ── Low complexity, budget NOT constrained ────────────────────────────────

  it('routes low-complexity unconstrained work to Gemini Flash', () => {
    const result = routeRequest({
      workType: 'classification',
      complexity: 20,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(result.provider).toBe('gemini')
    expect(result.model).toBe('gemini-1.5-flash')
    expect(result.complexityTier).toBe('low')
    expect(result.reasoning).not.toMatch(/constrained/i)
  })

  // ── Low complexity, budget constrained ────────────────────────────────────

  it('routes low-complexity budget-constrained work to GPT-3.5-turbo', () => {
    const result = routeRequest({
      workType: 'bulk_text',
      complexity: 10,
      tokenBudgetRemaining: TIGHT_BUDGET,
    })
    expect(result.provider).toBe('openai')
    expect(result.model).toBe('gpt-3.5-turbo')
    expect(result.complexityTier).toBe('low')
    expect(result.reasoning).toMatch(/constrained/i)
    expect(result.reasoning).toMatch(/gpt-3.5-turbo/)
  })

  it('uses GPT-3.5-turbo when tokenBudgetRemaining is exactly the threshold minus 1', () => {
    const result = routeRequest({
      workType: 'question_answering',
      complexity: 30,
      tokenBudgetRemaining: BUDGET_CONSTRAINED_THRESHOLD - 1,
    })
    expect(result.model).toBe('gpt-3.5-turbo')
  })

  it('uses Gemini Flash when tokenBudgetRemaining equals the threshold exactly', () => {
    // threshold is NOT constrained (must be strictly below)
    const result = routeRequest({
      workType: 'data_extraction',
      complexity: 25,
      tokenBudgetRemaining: BUDGET_CONSTRAINED_THRESHOLD,
    })
    expect(result.model).toBe('gemini-1.5-flash')
  })

  // ── Return shape ──────────────────────────────────────────────────────────

  it('always returns provider, model, reasoning, capabilityScore, estimatedCostPer1MTokens', () => {
    const result = routeRequest({
      workType: 'coding',
      complexity: 80,
      tokenBudgetRemaining: AMPLE_BUDGET,
    })
    expect(typeof result.provider).toBe('string')
    expect(typeof result.model).toBe('string')
    expect(typeof result.reasoning).toBe('string')
    expect(result.reasoning.length).toBeGreaterThan(0)
    expect(typeof result.capabilityScore).toBe('number')
    expect(result.capabilityScore).toBeGreaterThan(0)
    expect(typeof result.estimatedCostPer1MTokens).toBe('number')
    expect(result.estimatedCostPer1MTokens).toBeGreaterThan(0)
  })

  it('includes workType in the reasoning string', () => {
    const workType = 'deep_reasoning'
    const result = routeRequest({ workType, complexity: 90, tokenBudgetRemaining: AMPLE_BUDGET })
    expect(result.reasoning).toContain(workType)
  })

  // ── Budget threshold boundary ─────────────────────────────────────────────

  it('high-complexity tasks always use Claude regardless of budget', () => {
    const result = routeRequest({
      workType: 'deep_reasoning',
      complexity: 75,
      tokenBudgetRemaining: 1, // near-zero budget
    })
    // High complexity always routes to Claude — budget doesn't downgrade it
    expect(result.provider).toBe('claude')
    expect(result.model).toBe('claude-sonnet-4-6')
  })
})
