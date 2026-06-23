// src/app/api/wiki/priorities/__tests__/route.test.ts
// Regression coverage for GET /api/wiki/priorities — parse the priorities table.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('https://app.test/api/wiki/priorities')

function mockSupabase(page: { content?: string } | null) {
  const single = vi.fn(() => Promise.resolve({ data: page, error: null }))
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) })),
  } as never)
}

describe('GET /api/wiki/priorities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('parses a markdown priorities table from page content', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const content = [
      '| 1 | Ship the thing | Active | NPS drops |',
      '| 2 | Second thing | Pending | Not started |',
    ].join('\n')
    mockSupabase({ content })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      priorities: Array<{ rank: number; priority: string; status: string; alertCondition: string }>
      count: number
    }
    expect(body.count).toBe(2)
    expect(body.priorities[0]).toEqual({
      rank: 1,
      priority: 'Ship the thing',
      status: 'Active',
      alertCondition: 'NPS drops',
    })
    expect(body.priorities[1].rank).toBe(2)
  })

  it('falls back to the 6 default priorities when no table is present', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ content: 'no table here' })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { priorities: unknown[]; count: number }
    expect(body.count).toBe(6)
    expect(body.priorities).toHaveLength(6)
  })

  it('falls back to defaults when the page is missing entirely', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase(null)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(6)
  })
})
