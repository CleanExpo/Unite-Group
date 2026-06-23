// src/app/api/wiki/[id]/__tests__/route.test.ts
// Regression coverage for GET /api/wiki/[id] — fetch a single wiki page.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'
import { NextRequest } from 'next/server'

const req = (id = 'p1') => new NextRequest(`https://app.test/api/wiki/${id}`)
const ctx = (id = 'p1') => ({ params: Promise.resolve({ id }) })

// `.single()` resolves to the supplied result.
function mockSupabase(result: { data?: unknown; error?: unknown }) {
  const single = vi.fn(() => Promise.resolve(result))
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn(() => ({ select })),
  } as never)
  return { select, eq, single }
}

describe('GET /api/wiki/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req(), ctx())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('returns 200 with the page, scoped to the supplied id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const page = { id: 'p1', title: 'Alpha', content: '# hi' }
    const { eq } = mockSupabase({ data: page, error: null })
    const res = await GET(req('p1'), ctx('p1'))
    expect(res.status).toBe(200)
    expect(eq).toHaveBeenCalledWith('id', 'p1')
    const body = (await res.json()) as typeof page
    expect(body).toEqual(page)
  })

  it('returns 404 when the row is not found (PGRST116)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = await GET(req('missing'), ctx('missing'))
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 500 on any other query error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { code: 'XX000', message: 'db down' } })
    const res = await GET(req(), ctx())
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('db down')
  })
})
