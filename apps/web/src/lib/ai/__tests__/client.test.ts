// src/lib/ai/__tests__/client.test.ts
// Unit tests for the Anthropic singleton client

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Anthropic SDK before importing the client.
// `create` echoes its body back so we can assert what the wrapper injects.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
    _opts: opts,
    messages: { create: vi.fn((body: unknown) => body) },
  })),
}))

import { getAIClient, getAIClientMode, resetAIClient } from '../client'

describe('getAIClient', () => {
  beforeEach(() => {
    resetAIClient()
    // Isolate auth env between tests
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    delete process.env.ANTHROPIC_AUTH_TOKEN
    process.env.ANTHROPIC_API_KEY = 'test-key-123'
  })

  it('returns an Anthropic client instance', () => {
    const client = getAIClient()
    expect(client).toBeDefined()
    expect(client.messages).toBeDefined()
  })

  it('returns the same instance on subsequent calls (singleton)', () => {
    const first = getAIClient()
    const second = getAIClient()
    expect(first).toBe(second)
  })

  it('throws if no credential is configured', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => getAIClient()).toThrow('ANTHROPIC_API_KEY')
  })

  it('returns a new instance after resetAIClient()', () => {
    const first = getAIClient()
    resetAIClient()
    const second = getAIClient()
    expect(first).not.toBe(second)
  })

  describe('auth mode', () => {
    it('uses apikey mode when only ANTHROPIC_API_KEY is set', () => {
      getAIClient()
      expect(getAIClientMode()).toBe('apikey')
    })

    it('prefers OAuth (Max plan) when CLAUDE_CODE_OAUTH_TOKEN is set', () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-token-abc'
      const client = getAIClient()
      expect(getAIClientMode()).toBe('oauth')
      // OAuth mode constructs the SDK with a Bearer authToken + beta header,
      // never an apiKey.
      const opts = (client as unknown as { _opts: Record<string, unknown> })._opts
      expect(opts.authToken).toBe('oauth-token-abc')
      // Must be explicitly null to suppress the x-api-key header (not just unset,
      // which the SDK would backfill from process.env.ANTHROPIC_API_KEY).
      expect(opts.apiKey).toBeNull()
      expect((opts.defaultHeaders as Record<string, string>)['anthropic-beta']).toBe(
        'oauth-2025-04-20',
      )
    })

    it('injects the Claude Code identity into the system prompt in OAuth mode', async () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-token-abc'
      const client = getAIClient()
      const sent = (await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        system: 'Be concise.',
        messages: [{ role: 'user', content: 'hi' }],
      })) as unknown as { system: string }
      expect(sent.system).toContain("You are Claude Code, Anthropic's official CLI")
      expect(sent.system).toContain('Be concise.')
    })

    it('does NOT alter the system prompt in apikey mode', async () => {
      const client = getAIClient()
      const sent = (await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        system: 'Be concise.',
        messages: [{ role: 'user', content: 'hi' }],
      })) as unknown as { system: string }
      expect(sent.system).toBe('Be concise.')
    })
  })
})
