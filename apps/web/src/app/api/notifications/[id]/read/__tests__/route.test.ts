// src/app/api/notifications/[id]/read/__tests__/route.test.ts
// Regression coverage — PATCH /api/notifications/[id]/read (mark notification read)
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { PATCH } from '../route'

// Builds a chainable Supabase update stub. The route calls
// .from().update().eq('id', id).eq('founder_id', user.id) and the final
// .eq() resolves to { error }.
function buildClient(result: { error: unknown }) {
  const eqFounder = vi.fn().mockResolvedValue(result)
  const eqId = vi.fn(() => ({ eq: eqFounder }))
  const update = vi.fn(() => ({ eq: eqId }))
  const from = vi.fn(() => ({ update }))
  return { client: { from } as never, from, update, eqId, eqFounder }
}

const req = () =>
  new Request('https://app.test/api/notifications/n1/read', { method: 'PATCH' })

// Next 16 hands the route a context object whose `params` is a Promise.
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PATCH /api/notifications/[id]/read', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PATCH(req(), ctx('n1'))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('marks the notification read, scoped to id + founder, returns 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { client, from, update, eqId, eqFounder } = buildClient({ error: null })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await PATCH(req(), ctx('n1'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)

    expect(from).toHaveBeenCalledWith('founder_notifications')
    // update sets read:true + a read_at timestamp
    const updateArg = update.mock.calls[0][0] as { read: boolean; read_at: string }
    expect(updateArg.read).toBe(true)
    expect(typeof updateArg.read_at).toBe('string')
    // founder-scoped to the right row
    expect(eqId).toHaveBeenCalledWith('id', 'n1')
    expect(eqFounder).toHaveBeenCalledWith('founder_id', 'u1')
  })

  it('returns 500 when the update errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { client } = buildClient({ error: { message: 'db down' } })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await PATCH(req(), ctx('n1'))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/failed to mark/i)
  })
})
