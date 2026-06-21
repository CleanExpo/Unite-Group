import { describe, it, expect, vi } from 'vitest'
import { executeChat, type ExecuteChatDeps } from '../execute'
import type { AccountRuntimeState } from '../router'
import type { ChatRequest, ChatResult } from '../adapters/openai-compatible'

const NOW = '2026-06-21T00:00:00.000Z'
const REQ: ChatRequest = { model: 'm', messages: [{ role: 'user', content: 'hi' }] }

function acct(provider: AccountRuntimeState['provider'], over: Partial<AccountRuntimeState> = {}): AccountRuntimeState {
  return { provider, accountId: `${provider}-1`, configured: true, state: 'available', ...over }
}

function deps(over: Partial<ExecuteChatDeps> = {}): ExecuteChatDeps {
  return {
    accounts: [acct('minimax'), acct('openrouter'), acct('claude')],
    resolveKey: async () => 'sk-key',
    now: NOW,
    ...over,
  }
}

const okClient = (over: Partial<{ text: string; inputTokens: number; outputTokens: number }> = {}) =>
  vi.fn(async (): Promise<ChatResult> => ({ ok: true, text: over.text ?? 'response', usage: { inputTokens: over.inputTokens ?? 5, outputTokens: over.outputTokens ?? 7 }, model: 'm' }))

describe('executeChat', () => {
  it('routes bulk_text to minimax, calls the client, returns text + usage, logs ok', async () => {
    const client = okClient()
    const logUsage = vi.fn(async () => {})
    const r = await executeChat('bulk_text', REQ, deps({ makeClient: () => client, logUsage }))
    expect(r).toMatchObject({ status: 'ok', provider: 'minimax', text: 'response', usage: { inputTokens: 5, outputTokens: 7 } })
    expect(client).toHaveBeenCalledOnce()
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'minimax-1', lane: 'bulk_text', outcome: 'ok' }))
  })

  it('reports needs_anthropic_path when the lane routes to claude', async () => {
    // deep_reasoning prefers claude; only claude available.
    const r = await executeChat('deep_reasoning', REQ, deps({ accounts: [acct('claude')], makeClient: () => okClient() }))
    expect(r).toMatchObject({ status: 'needs_anthropic_path', provider: 'claude' })
  })

  it('queues (never calls) when nothing is usable', async () => {
    const client = okClient()
    const r = await executeChat('video', REQ, deps({ accounts: [acct('minimax', { state: 'blocked' })], makeClient: () => client }))
    expect(r.status).toBe('queued')
    expect(client).not.toHaveBeenCalled()
  })

  it('errors when the credential cannot be resolved (no spend)', async () => {
    const client = okClient()
    const r = await executeChat('bulk_text', REQ, deps({ resolveKey: async () => null, makeClient: () => client }))
    expect(r).toMatchObject({ status: 'error', reason: expect.stringContaining('credential') })
    expect(client).not.toHaveBeenCalled()
  })

  it('maps a rate_limited client result and logs the cool-down', async () => {
    const client = vi.fn(async (): Promise<ChatResult> => ({ ok: false, reason: 'rate_limited', resetAt: '2026-06-21T05:00:00.000Z' }))
    const logUsage = vi.fn(async () => {})
    const r = await executeChat('bulk_text', REQ, deps({ makeClient: () => client, logUsage }))
    expect(r).toMatchObject({ status: 'error', rateLimited: true, resetAt: '2026-06-21T05:00:00.000Z' })
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'rate_limited' }))
  })
})
