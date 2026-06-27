import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted above all imports by Vitest transform) ────────────────────

const mockInsertEvent = vi.fn(async () => {})

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/provider-pool/repository', () => ({
  makeSupabaseStore: vi.fn(() => ({ insertEvent: mockInsertEvent })),
  loadAccounts: vi.fn(),
}))

vi.mock('@/lib/provider-pool/execute', () => ({ executeChat: vi.fn() }))

vi.mock('@/lib/provider-pool/credentials', () => ({ resolveEnvKey: vi.fn(() => 'env-key') }))

// ── Static imports ──────────────────────────────────────────────────────────

import { getUser, createClient } from '@/lib/supabase/server'
import { loadAccounts } from '@/lib/provider-pool/repository'
import { executeChat } from '@/lib/provider-pool/execute'
import { POST } from '../route'

// Two registered accounts feed the route's providerByAccount map + executeChat.
const ACCOUNTS = [
  { accountId: 'a1', provider: 'anthropic' },
  { accountId: 'a2', provider: 'openai' },
] as never

describe('POST /api/command-center/provider-test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(loadAccounts).mockResolvedValue(ACCOUNTS)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
    expect(loadAccounts).not.toHaveBeenCalled()
  })

  it('returns 200 no_accounts when the founder has registered no provider accounts', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(loadAccounts).mockResolvedValue([] as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('no_accounts')
    expect(executeChat).not.toHaveBeenCalled()
  })

  it('maps an ok pool outcome to the response, founder-scoped through loadAccounts', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(executeChat).mockResolvedValue({
      status: 'ok',
      provider: 'anthropic',
      accountId: 'a1',
      text: 'PONG',
      usage: { inputTokens: 5, outputTokens: 1 },
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; text: string }
    expect(body.status).toBe('ok')
    expect(body.text).toBe('PONG')
    // founder id is passed through to loadAccounts (scoping invariant)
    expect(vi.mocked(loadAccounts).mock.calls[0][1]).toBe('u1')
    expect(executeChat).toHaveBeenCalledWith('scout', expect.any(Object), expect.any(Object))
  })

  it('maps a queued pool outcome straight through (still 200)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(executeChat).mockResolvedValue({ status: 'queued', reason: 'all accounts exhausted' } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; reason: string }
    expect(body.status).toBe('queued')
    expect(body.reason).toBe('all accounts exhausted')
  })

  it('maps a needs_anthropic_path pool outcome straight through (still 200)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(executeChat).mockResolvedValue({
      status: 'needs_anthropic_path',
      provider: 'anthropic',
      accountId: 'a1',
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; provider: string }
    expect(body.status).toBe('needs_anthropic_path')
    expect(body.provider).toBe('anthropic')
  })

  it('returns 500 when the pool execution throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(executeChat).mockRejectedValue(new Error('boom'))
    const res = await POST()
    expect(res.status).toBe(500)
    const body = (await res.json()) as { status: string; reason: string }
    expect(body.status).toBe('error')
    expect(body.reason).toBe('test failed') // sanitised — raw error not leaked to client
    expect(body.reason).not.toContain('boom')
  })
})
