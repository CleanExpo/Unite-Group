// src/app/api/wiki/exit-thesis/__tests__/route.test.ts
// Regression coverage for GET /api/wiki/exit-thesis — exit thesis projection.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('https://app.test/api/wiki/exit-thesis')

// `from('wiki_pages')` → .select().eq().single()
// `from('businesses')` → .select().eq() (awaited directly)
function mockSupabase(opts: {
  page?: { content?: string; updated_at?: string } | null
  businesses?: Array<{ arr_aud: number | string; slug: string }>
}) {
  const eqBusinesses = vi.fn(() =>
    Promise.resolve({ data: opts.businesses ?? [], error: null }),
  )
  const from = vi.fn((table: string) => {
    if (table === 'wiki_pages') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: opts.page ?? null, error: null })),
          })),
        })),
      }
    }
    // businesses
    return { select: vi.fn(() => ({ eq: eqBusinesses })) }
  })
  vi.mocked(createClient).mockResolvedValue({ from } as never)
  return { from, eqBusinesses }
}

describe('GET /api/wiki/exit-thesis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('sums founder-scoped ARR and returns the projection', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { eqBusinesses } = mockSupabase({
      page: { updated_at: '2026-06-01T00:00:00Z' },
      businesses: [
        { arr_aud: 1_000_000, slug: 'a' },
        { arr_aud: 2_000_000, slug: 'b' },
      ],
    })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(eqBusinesses).toHaveBeenCalledWith('founder_id', 'u1')
    const body = (await res.json()) as {
      currentArr: number
      minTargetArr: number
      maxTargetArr: number
      gapToMin: number
      dealComps: unknown[]
      lastUpdated: string | null
    }
    expect(body.currentArr).toBe(3_000_000)
    expect(body.minTargetArr).toBe(167_000_000)
    expect(body.maxTargetArr).toBe(250_000_000)
    expect(body.gapToMin).toBe(167_000_000 - 3_000_000)
    expect(body.dealComps).toHaveLength(3)
    expect(body.lastUpdated).toBe('2026-06-01T00:00:00Z')
  })

  it('defaults currentArr to 0 and lastUpdated to null when there is no data', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ page: null, businesses: [] })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { currentArr: number; lastUpdated: string | null }
    expect(body.currentArr).toBe(0)
    expect(body.lastUpdated).toBeNull()
  })
})
