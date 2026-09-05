// src/lib/command-centre/__tests__/classify-idea.test.ts
import { afterEach, describe, it, expect, vi } from 'vitest'
import { toRoutingDecision, classifyIdea } from '../classify-idea'
import { resetAIClient } from '@/lib/ai/client'

const ctx = { idea: 'Run a winter promo on social', clarifications: { questions: [], answers: {} } }
const model = (text: string) => ({ messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }) } })

afterEach(() => {
  vi.unstubAllEnvs()
  resetAIClient()
})

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
  it('keeps a missing client credential advisory by default', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    resetAIClient()
    expect(await classifyIdea(ctx)).toMatchObject({ lane: 'unknown', planBuild: [], planDistribute: [] })
  })
  it('identifies missing client configuration safely in strict delivery mode', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    resetAIClient()
    await expect(classifyIdea(ctx, undefined, { strict: true })).rejects.toMatchObject({
      code: 'preparation_provider_configuration',
      diagnostic: { stage: 'classification', errorName: 'AIConfigurationError' },
    })
  })
  it('preserves a safe provider authentication failure in strict delivery mode', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(Object.assign(new Error('private provider response'), { name: 'AuthenticationError', status: 401, request_id: 'req_0123456789abcdef' })) } }
    await expect(classifyIdea(ctx, client as never, { strict: true })).rejects.toMatchObject({
      code: 'preparation_provider_authentication',
      diagnostic: { stage: 'classification', errorName: 'AuthenticationError', status: 401, requestId: 'req_0123456789abcdef' },
    })
  })
  it.each(['not json', '{"lane":"banana","confidence":0.8,"rationale":"unknown"}'])(
    'rejects invalid classifier output in strict mode without inventing a lane: %s',
    async (text) => {
      await expect(classifyIdea(ctx, model(text) as never, { strict: true })).rejects.toMatchObject({ code: 'preparation_response_invalid' })
    },
  )
})
