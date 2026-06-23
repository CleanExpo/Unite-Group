// src/app/api/notifications/__tests__/route.test.ts
// Regression coverage — GET /api/notifications (founder notifications inbox)
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

// Builds a chainable Supabase query stub whose terminal `.limit()` resolves
// to the given { data, error }. Mirrors the route's
// .from().select().eq().order().limit() chain.
function buildClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result)
  const order = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as never, from, select, eq, order, limit }
}

describe('GET /api/notifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('returns founder-scoped notifications with an unread count on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const rows = [
      { id: 'n1', type: 'a', payload: {}, read: false, read_at: null, created_at: '2026-06-22T00:00:00Z' },
      { id: 'n2', type: 'b', payload: {}, read: true, read_at: '2026-06-22T01:00:00Z', created_at: '2026-06-21T00:00:00Z' },
      { id: 'n3', type: 'c', payload: {}, read: false, read_at: null, created_at: '2026-06-20T00:00:00Z' },
    ]
    const { client, from, eq } = buildClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { notifications: unknown[]; unreadCount: number }
    expect(body.notifications).toHaveLength(3)
    expect(body.unreadCount).toBe(2)
    expect(from).toHaveBeenCalledWith('founder_notifications')
    expect(eq).toHaveBeenCalledWith('founder_id', 'u1')
  })

  it('treats a null data result as an empty inbox (unreadCount 0)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { client } = buildClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { notifications: unknown[]; unreadCount: number }
    expect(body.notifications).toEqual([])
    expect(body.unreadCount).toBe(0)
  })

  it('returns 500 when the query errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { client } = buildClient({ data: null, error: { message: 'db down' } })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/failed to fetch/i)
  })
})
