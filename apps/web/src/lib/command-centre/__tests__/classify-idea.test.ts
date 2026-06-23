// src/lib/command-centre/__tests__/classify-idea.test.ts
import { describe, it, expect, vi } from 'vitest'
import { toRoutingDecision, classifyIdea } from '../classify-idea'

const ctx = { idea: 'Run a winter promo on social', clarifications: { questions: [], answers: {} } }
const model = (text: string) => ({ messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] }) } })

describe('toRoutingDecision', () => {
  it('accepts a valid lane and attaches that lane’s plans', () => {
    const d = toRoutingDecision('marketing', 0.9, 'Clearly a campaign', ctx)
    expect(d.lane).toBe('marketing')
    expect(d.confidence).toBe(0.9)
    expect(d.planBuild.length).toBeGreaterThan(0)
    expect(d.planDistribute.length).toBeGreaterThan(0)
  })
  it('falls back to unknown (empty plans) on an invalid lane or bad confidence', () => {
    const d = toRoutingDecision('banana', 5, '', ctx)
    expect(d.lane).toBe('unknown')
    expect(d.confidence).toBe(0)
    expect(d.planBuild).toEqual([])
  })
})

describe('classifyIdea', () => {
  it('routes from the model JSON', async () => {
    const d = await classifyIdea(ctx, model('{"lane":"marketing","confidence":0.8,"rationale":"promo"}') as never)
    expect(d.lane).toBe('marketing')
  })
  it('returns unknown when the model fails', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('boom')) } }
    expect((await classifyIdea(ctx, client as never)).lane).toBe('unknown')
  })
})
