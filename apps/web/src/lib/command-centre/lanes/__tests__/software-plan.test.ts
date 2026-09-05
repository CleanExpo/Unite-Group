// src/lib/command-centre/lanes/__tests__/software-plan.test.ts
// TDD: Unit 1 — generateBuildPlan
import { describe, it, expect, vi } from 'vitest'
import { generateBuildPlan } from '../software-plan'

function modelReturning(text: string) {
  return { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }) } }
}

const VALID_PLAN = JSON.stringify({
  title: 'Add login page',
  summary: 'Build a login page with email/password',
  acceptanceCriteria: ['User can log in', 'Invalid credentials show an error'],
  steps: ['Scope & branch', 'Implement', 'Test', 'Open PR for review'],
})

describe('generateBuildPlan', () => {
  it('parses valid JSON from the model', async () => {
    const client = modelReturning(VALID_PLAN)
    const plan = await generateBuildPlan('Add login page', client as never)
    expect(plan.title).toBe('Add login page')
    expect(plan.summary).toBe('Build a login page with email/password')
    expect(plan.acceptanceCriteria).toEqual(['User can log in', 'Invalid credentials show an error'])
    expect(plan.steps).toEqual(['Scope & branch', 'Implement', 'Test', 'Open PR for review'])
  })

  it('returns deterministic fallback when model throws', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('500')) } }
    const idea = 'Add login page'
    const plan = await generateBuildPlan(idea, client as never)
    expect(plan.title).toBe(idea)
    expect(plan.summary).toBe(idea)
    expect(plan.acceptanceCriteria).toEqual([
      'Behaviour matches the idea',
      'Tests cover the change',
      'No regressions',
    ])
    expect(plan.steps).toEqual(['Scope & branch', 'Implement', 'Test', 'Open PR for review'])
  })

  it('returns deterministic fallback when output is unparseable', async () => {
    const client = modelReturning('not json at all')
    const idea = 'Something complex'
    const plan = await generateBuildPlan(idea, client as never)
    expect(plan.title).toBe(idea)
    expect(plan.steps).toHaveLength(4)
  })

  it('truncates long idea text in fallback title', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('x')) } }
    const longIdea = 'A'.repeat(200)
    const plan = await generateBuildPlan(longIdea, client as never)
    expect(plan.title.length).toBeLessThanOrEqual(120)
  })
})

const planAtLimits = (titleLength: number, criteriaCount: number, stepCount: number) => ({
  title: 'A'.repeat(titleLength),
  summary: 'Build the customer portal.',
  acceptanceCriteria: Array.from({ length: criteriaCount }, (_, index) => `Criterion ${index + 1}`),
  steps: Array.from({ length: stepCount }, (_, index) => `Step ${index + 1}`),
})

describe('strict build-plan bounds', () => {
  it.each([
    { titleLength: 81, criteriaCount: 2, stepCount: 3 },
    { titleLength: 80, criteriaCount: 1, stepCount: 3 },
    { titleLength: 80, criteriaCount: 6, stepCount: 3 },
    { titleLength: 80, criteriaCount: 2, stepCount: 2 },
    { titleLength: 80, criteriaCount: 2, stepCount: 7 },
  ])('rejects out-of-bounds strict plans without changing advisory acceptance: %j', async ({ titleLength, criteriaCount, stepCount }) => {
    const plan = planAtLimits(titleLength, criteriaCount, stepCount)
    const client = modelReturning(JSON.stringify(plan))
    await expect(generateBuildPlan('A customer portal', client, { strict: true })).rejects.toMatchObject({
      name: 'PreparationResponseError', reason: 'invalid_values',
    })
    expect(client.messages.create).toHaveBeenCalledTimes(1)
    expect(await generateBuildPlan('A customer portal', modelReturning(JSON.stringify(plan)))).toEqual(plan)
  })

  it.each([
    { titleLength: 1, criteriaCount: 2, stepCount: 3 },
    { titleLength: 80, criteriaCount: 5, stepCount: 6 },
  ])('accepts the declared strict boundaries without truncating the plan: %j', async ({ titleLength, criteriaCount, stepCount }) => {
    const plan = planAtLimits(titleLength, criteriaCount, stepCount)
    expect(await generateBuildPlan('A customer portal', modelReturning(JSON.stringify(plan)), { strict: true })).toEqual(plan)
  })
})
