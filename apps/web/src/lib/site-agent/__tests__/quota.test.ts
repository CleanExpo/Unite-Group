import { describe, it, expect, vi, beforeEach } from 'vitest'

// UNI-2917 — durable daily ceiling + kill switch for the public site agent.
//
// The SQL function itself (row locks, Brisbane day, ceilings, kill switch) is
// exercised against a real Postgres in the PR evidence; these tests pin the
// TypeScript side: the RPC contract, fail-closed handling, the HTTP mapping,
// and — the point of the issue — that the ceiling is shared state, not
// per-instance memory.

const routeMocks = vi.hoisted(() => ({
  validateSiteKey: vi.fn(),
  getAIClient: vi.fn(),
}))

vi.mock('@/lib/site-agent/site-keys', () => ({ validateSiteKey: routeMocks.validateSiteKey }))
vi.mock('@/lib/ai/client', () => ({ getAIClient: routeMocks.getAIClient }))
vi.mock('@/lib/ai/usage-recorder', () => ({ recordAiUsage: vi.fn(async () => undefined) }))
vi.mock('@/lib/site-agent/grounding', () => ({
  ground: vi.fn(async () => ({ snippets: [], source: 'none', businessName: 'Unite-Group' })),
  formatGroundingContext: vi.fn(() => ''),
}))

// A stand-in for the database: ONE store shared by every route instance, with
// the same contract as claim_public_agent_quota (per-key and per-founder
// ceilings, kill switch). If the routes kept the ceiling in module memory,
// two instances would each allow the full budget.
const db = vi.hoisted(() => {
  const state = {
    enabled: true,
    keyLimit: 3,
    founderLimit: 5,
    counts: new Map<string, number>(),
    calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  }
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    state.calls.push({ fn, args })
    if (!state.enabled) return { data: 'paused', error: null }
    const keyId = `${args.p_scope}|${args.p_kind}`
    const founderId = `*founder|${args.p_kind}`
    const k = state.counts.get(keyId) ?? 0
    const f = state.counts.get(founderId) ?? 0
    if (k >= state.keyLimit) return { data: 'key_ceiling', error: null }
    if (f >= state.founderLimit) return { data: 'founder_ceiling', error: null }
    state.counts.set(keyId, k + 1)
    state.counts.set(founderId, f + 1)
    return { data: 'ok', error: null }
  })
  return { state, rpc }
})

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ rpc: db.rpc })),
}))

import {
  claimPublicAgentQuota,
  quotaRefusalResponse,
  secondsUntilBrisbaneMidnight,
} from '../quota'

function stream() {
  return (async function* () {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } }
  })()
}

function chatReq(siteKey: string, ip: string) {
  return new Request('https://app.test/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ siteKey, messages: [{ role: 'user', content: 'hi' }] }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.state.enabled = true
  db.state.keyLimit = 3
  db.state.founderLimit = 5
  db.state.counts.clear()
  db.state.calls.length = 0
  routeMocks.validateSiteKey.mockResolvedValue({ ok: true, founderId: 'founder-1', businessKey: 'unite-group' })
  routeMocks.getAIClient.mockReturnValue({ messages: { create: vi.fn(async () => stream()) } })
})

describe('claimPublicAgentQuota', () => {
  function client(result: { data?: unknown; error?: { message: string } | null } | Error) {
    return {
      rpc: vi.fn(async () => {
        if (result instanceof Error) throw result
        return { data: result.data ?? null, error: result.error ?? null }
      }),
    } as any
  }

  it('calls the RPC with the founder, a key-prefixed scope and the kind', async () => {
    const c = client({ data: 'ok' })
    await claimPublicAgentQuota(c, 'founder-1', 'sk_site_abc', 'voice')
    expect(c.rpc).toHaveBeenCalledWith('claim_public_agent_quota', {
      p_founder_id: 'founder-1',
      p_scope: 'key:sk_site_abc',
      p_kind: 'voice',
    })
  })

  it('passes ok and each named refusal through', async () => {
    expect(await claimPublicAgentQuota(client({ data: 'ok' }), 'f', 'k', 'chat')).toEqual({ ok: true })
    for (const reason of ['paused', 'key_ceiling', 'founder_ceiling']) {
      expect(await claimPublicAgentQuota(client({ data: reason }), 'f', 'k', 'chat')).toEqual({ ok: false, reason })
    }
  })

  it('fails closed: RPC error, thrown error and unexpected data all refuse', async () => {
    for (const c of [
      client({ error: { message: 'function claim_public_agent_quota does not exist' } }),
      client(new Error('network down')),
      client({ data: 'OK' }),
      client({ data: true }),
      client({ data: null }),
    ]) {
      expect(await claimPublicAgentQuota(c, 'f', 'k', 'chat')).toEqual({ ok: false, reason: 'unavailable' })
    }
  })
})

describe('quotaRefusalResponse', () => {
  it('maps ceilings to 429 and paused/unavailable to 503 without naming which ceiling tripped', () => {
    expect(quotaRefusalResponse('key_ceiling')).toMatchObject({ status: 429, error: 'Daily limit reached' })
    expect(quotaRefusalResponse('founder_ceiling')).toMatchObject({ status: 429, error: 'Daily limit reached' })
    expect(quotaRefusalResponse('paused')).toMatchObject({ status: 503, error: 'Agent is unavailable' })
    expect(quotaRefusalResponse('unavailable')).toMatchObject({ status: 503, error: 'Agent is unavailable' })
  })

  it('counts Retry-After down to Brisbane midnight (UTC+10)', () => {
    // 13:59:00Z = 23:59:00 Brisbane → 60 s left.
    expect(secondsUntilBrisbaneMidnight(new Date('2026-10-05T13:59:00Z'))).toBe(60)
    // 14:00:00Z = 00:00 Brisbane → a full day.
    expect(secondsUntilBrisbaneMidnight(new Date('2026-10-05T14:00:00Z'))).toBe(86_400)
  })
})

describe('the ceiling holds across instances (shared state, not module memory)', () => {
  it('two independently loaded route instances share one per-key ceiling', async () => {
    vi.resetModules()
    const instanceA = await import('@/app/api/agent/route')
    vi.resetModules()
    const instanceB = await import('@/app/api/agent/route')
    expect(instanceA.POST).not.toBe(instanceB.POST)

    const statuses: number[] = []
    // Alternate instances and IPs so neither the in-memory limiter nor a single
    // isolate is what refuses: only the shared store can.
    for (let i = 0; i < 6; i++) {
      const route = i % 2 === 0 ? instanceA : instanceB
      const res = await route.POST(chatReq('sk_site_shared', `203.0.113.${i}`))
      await res.text()
      statuses.push(res.status)
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429, 429])
  })

  it('the founder-wide ceiling trips across different keys and instances', async () => {
    vi.resetModules()
    const instanceA = await import('@/app/api/agent/route')
    vi.resetModules()
    const instanceB = await import('@/app/api/agent/route')

    const statuses: number[] = []
    for (let i = 0; i < 7; i++) {
      const route = i % 2 === 0 ? instanceA : instanceB
      const res = await route.POST(chatReq(`sk_site_k${i}`, `198.51.100.${i}`))
      await res.text()
      statuses.push(res.status)
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429])
  })

  it('one kill switch closes both public endpoints, chat and voice, on every instance', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-xi-key'
    process.env.ELEVENLABS_SITE_AGENT_ID = 'agent-abc'
    const fetchSpy = vi.fn()
    const realFetch = globalThis.fetch
    globalThis.fetch = fetchSpy as any
    try {
      db.state.enabled = false
      vi.resetModules()
      const chat = await import('@/app/api/agent/route')
      const voice = await import('@/app/api/agent/voice/signed-url/route')

      const chatRes = await chat.POST(chatReq('sk_site_any', '192.0.2.1'))
      const voiceRes = await voice.POST(
        new Request('https://app.test/api/agent/voice/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.2' },
          body: JSON.stringify({ siteKey: 'sk_site_any' }),
        }),
      )

      expect(chatRes.status).toBe(503)
      expect(voiceRes.status).toBe(503)
      expect(routeMocks.getAIClient).not.toHaveBeenCalled()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(db.state.calls.map((c) => c.args.p_kind)).toEqual(['chat', 'voice'])
    } finally {
      globalThis.fetch = realFetch
      delete process.env.ELEVENLABS_API_KEY
      delete process.env.ELEVENLABS_SITE_AGENT_ID
    }
  })
})
