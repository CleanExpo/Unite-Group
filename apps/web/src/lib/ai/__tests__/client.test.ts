import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sdk } = vi.hoisted(() => ({ sdk: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: sdk.mockImplementation((options: Record<string, unknown>) => ({
    _options: options,
    messages: { create: vi.fn() },
  })),
}))

import { getAIClient, resetAIClient } from '../client'

describe('getAIClient server credential boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAIClient()
    process.env.ANTHROPIC_API_KEY = 'metered-api-key'
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    delete process.env.ANTHROPIC_AUTH_TOKEN
  })

  it('uses only the metered Anthropic API credential', () => {
    const client = getAIClient()

    expect(client).toBeDefined()
    expect(sdk).toHaveBeenCalledWith({ apiKey: 'metered-api-key', maxRetries: 0 })
  })

  it('returns the same instance until reset', () => {
    const first = getAIClient()
    expect(getAIClient()).toBe(first)
    resetAIClient()
    expect(getAIClient()).not.toBe(first)
  })

  it('rejects consumer Claude session credentials as backend API credentials', () => {
    delete process.env.ANTHROPIC_API_KEY
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'consumer-session-token'
    process.env.ANTHROPIC_AUTH_TOKEN = 'alternate-consumer-token'

    expect(() => getAIClient()).toThrow(
      'ANTHROPIC_API_KEY is required for the metered server route',
    )
    expect(sdk).not.toHaveBeenCalled()
  })

  it('never forwards consumer tokens when an API key is configured', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'consumer-session-token'
    process.env.ANTHROPIC_AUTH_TOKEN = 'alternate-consumer-token'

    getAIClient()

    const options = sdk.mock.calls[0][0] as Record<string, unknown>
    expect(options).toEqual({ apiKey: 'metered-api-key', maxRetries: 0 })
    expect(JSON.stringify(options)).not.toContain('consumer-session-token')
    expect(JSON.stringify(options)).not.toContain('alternate-consumer-token')
  })
})
