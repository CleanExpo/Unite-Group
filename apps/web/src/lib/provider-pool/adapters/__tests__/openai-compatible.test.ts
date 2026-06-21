import { describe, it, expect, vi } from 'vitest'
import { makeOpenAICompatibleClient, type ChatRequest } from '../openai-compatible'

const BASE = 'https://api.minimax.io/v1'

const req: ChatRequest = {
  model: 'abab6.5s-chat',
  messages: [{ role: 'user', content: 'Hello' }],
  maxTokens: 256,
  temperature: 0.7,
}

describe('makeOpenAICompatibleClient — not configured', () => {
  it('returns not_configured WITHOUT calling fetch when no apiKey', async () => {
    const fetchFn = vi.fn()
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: undefined,
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toEqual({ ok: false, reason: 'not_configured' })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('makeOpenAICompatibleClient — success', () => {
  it('parses the OpenAI response shape', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        model: 'abab6.5s-chat',
        choices: [{ message: { content: 'Hi there' } }],
        usage: { prompt_tokens: 11, completion_tokens: 4 },
      }),
    }) as Response)

    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)

    expect(r).toEqual({
      ok: true,
      text: 'Hi there',
      usage: { inputTokens: 11, outputTokens: 4 },
      model: 'abab6.5s-chat',
    })
    // Hits the chat-completions endpoint with Bearer auth + mapped body.
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.minimax.io/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer sk-test' }),
      }),
    )
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string)
    expect(body).toMatchObject({ model: 'abab6.5s-chat', max_tokens: 256, temperature: 0.7 })
  })

  it('defaults usage to 0 and model to the request model when absent', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    }) as Response)
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toMatchObject({ ok: true, usage: { inputTokens: 0, outputTokens: 0 }, model: req.model })
  })
})

describe('makeOpenAICompatibleClient — rate limited', () => {
  it('maps 429 to rate_limited with resetAt from retry-after', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '30' }),
      json: async () => ({}),
    }) as Response)
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toEqual({ ok: false, reason: 'rate_limited', resetAt: '30' })
  })

  it('falls back to x-ratelimit-reset, else null', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: async () => ({}),
    }) as Response)
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toEqual({ ok: false, reason: 'rate_limited', resetAt: null })
  })
})

describe('makeOpenAICompatibleClient — errors', () => {
  it('maps other non-2xx to error with HTTP detail', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
    }) as Response)
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toEqual({ ok: false, reason: 'error', detail: 'HTTP 500' })
  })

  it('catches a network throw and never throws', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('socket hang up')
    })
    const client = makeOpenAICompatibleClient({
      baseUrl: BASE,
      apiKey: 'sk-test',
      fetchFn: fetchFn as unknown as typeof fetch,
    })
    const r = await client(req)
    expect(r).toEqual({ ok: false, reason: 'error', detail: 'socket hang up' })
  })
})
