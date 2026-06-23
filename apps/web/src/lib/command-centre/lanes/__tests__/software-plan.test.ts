// src/lib/command-centre/lanes/__tests__/software-plan.test.ts
// TDD: Unit 1 — generateBuildPlan
import { describe, it, expect, vi } from 'vitest'
import { generateBuildPlan } from '../software-plan'

function modelReturning(text: string) {
  return { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] }) } }
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
