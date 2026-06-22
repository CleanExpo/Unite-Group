import { describe, expect, it, vi, beforeEach } from 'vitest'
import { classifyWork } from '@/lib/work/classifier'
import * as clientModule from '@/lib/ai/client'

function mockAnthropicResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'end_turn',
    usage: { input_tokens: 50, output_tokens: 30 },
  }
}

function mockClient(responseText: string) {
  const create = vi.fn().mockResolvedValue(mockAnthropicResponse(responseText))
  vi.spyOn(clientModule, 'getAIClient').mockReturnValue({
    messages: { create },
  } as unknown as ReturnType<typeof clientModule.getAIClient>)
  return create
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('classifyWork', () => {
  it('routes a Synthex scheduling bug correctly', async () => {
    mockClient(JSON.stringify({
      system: 'Synthex',
      workType: 'bug',
      confidence: 0.95,
      suggestedTitle: 'Fix Instagram post scheduling failure',
    }))

    const result = await classifyWork(
      "The social media scheduler isn't posting to Instagram at the scheduled time",
    )

    expect(result.intent.system).toBe('Synthex')
    expect(result.intent.workType).toBe('bug')
    expect(result.confidence).toBe(0.95)
    expect(result.suggestedTitle).toBe('Fix Instagram post scheduling failure')
  })

  it('routes a Nexus MRR dashboard feature correctly', async () => {
    mockClient(JSON.stringify({
      system: 'Nexus',
      workType: 'feature',
      confidence: 0.92,
      suggestedTitle: 'Add monthly recurring revenue dashboard',
    }))

    const result = await classifyWork(
      'We need a new dashboard showing monthly recurring revenue trends',
      'Should integrate with Xero data already in the system',
    )

    expect(result.intent.system).toBe('Nexus')
    expect(result.intent.workType).toBe('feature')
    expect(result.confidence).toBeCloseTo(0.92)
  })

  it('routes a RestoreAssist backup encryption feature correctly', async () => {
    mockClient(JSON.stringify({
      system: 'RestoreAssist',
      workType: 'feature',
      confidence: 0.91,
      suggestedTitle: 'Add automatic backup encryption for DR cases',
    }))

    const result = await classifyWork(
      'Add support for automatic backup encryption for client disaster recovery cases',
    )

    expect(result.intent.system).toBe('RestoreAssist')
    expect(result.intent.workType).toBe('feature')
    expect(result.suggestedTitle).toContain('backup encryption')
  })

  it('passes context to the LLM when provided', async () => {
    const create = mockClient(JSON.stringify({
      system: 'Nexus',
      workType: 'infra',
      confidence: 0.88,
      suggestedTitle: 'Fix database connection pool exhaustion',
    }))

    await classifyWork(
      'The database is running out of connections during peak hours',
      'Uses PostgreSQL with pg pool, max 20 connections',
    )

    const callArgs = create.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('Additional context')
    expect(callArgs.messages[0].content).toContain('PostgreSQL')
  })

  it('clamps confidence to [0, 1]', async () => {
    mockClient(JSON.stringify({
      system: 'Nexus',
      workType: 'bug',
      confidence: 1.5,
      suggestedTitle: 'Some title',
    }))

    const result = await classifyWork('some description')
    expect(result.confidence).toBe(1)
  })

  it('truncates suggestedTitle to 80 chars', async () => {
    mockClient(JSON.stringify({
      system: 'Synthex',
      workType: 'feature',
      confidence: 0.8,
      suggestedTitle: 'A'.repeat(120),
    }))

    const result = await classifyWork('some description')
    expect(result.suggestedTitle.length).toBe(80)
  })

  it('throws when the LLM returns an invalid system', async () => {
    mockClient(JSON.stringify({
      system: 'Unknown',
      workType: 'bug',
      confidence: 0.5,
      suggestedTitle: 'Some title',
    }))

    await expect(classifyWork('some description')).rejects.toThrow('Invalid system')
  })

  it('throws when the LLM returns non-JSON', async () => {
    mockClient('Sorry, I cannot classify that.')

    await expect(classifyWork('some description')).rejects.toThrow('non-JSON response')
  })
})
