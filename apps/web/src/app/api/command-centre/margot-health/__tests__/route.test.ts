// src/app/api/command-centre/margot-health/__tests__/route.test.ts
// GET /api/command-centre/margot-health — auth gate + defensive presence cap (UNI-2307).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

/** Chainable query-builder stub: every method returns itself; awaiting it resolves `result`. */
function makeBuilder(result: { data: unknown; error: unknown } | { count: number; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const self = () => builder
  builder.select = vi.fn(self)
  builder.eq = vi.fn(self)
  builder.gte = vi.fn(self)
  builder.order = vi.fn(self)
  builder.limit = vi.fn(self)
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return builder
}

describe('GET /api/command-centre/margot-health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('caps the operator_agent_presence read with a defensive .limit(500)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)

    const voiceCountBuilder = makeBuilder({ count: 2, error: null } as never)
    const latestVoiceBuilder = makeBuilder({ data: [{ created_at: '2026-07-01T00:00:00.000Z' }], error: null })
    const presenceBuilder = makeBuilder({ data: [{ last_seen_at: '2026-07-05T00:00:00.000Z' }], error: null })

    let voiceCalls = 0
    const from = vi.fn((table: string) => {
      if (table === 'operator_agent_presence') return presenceBuilder
      // margot_voice_sessions is queried twice: count-head then latest-row.
      voiceCalls += 1
      return voiceCalls === 1 ? voiceCountBuilder : latestVoiceBuilder
    })
    vi.mocked(createClient).mockResolvedValue({ from } as never)

    const res = await GET()
    expect(res.status).toBe(200)

    expect(presenceBuilder.limit).toHaveBeenCalledWith(500)
    const body = (await res.json()) as { agents: { activeCount: number } }
    expect(body.agents.activeCount).toBe(1)
  })
})
