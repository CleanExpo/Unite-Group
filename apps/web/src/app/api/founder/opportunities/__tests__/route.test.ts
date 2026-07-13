import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLimit = vi.fn<() => { data: any[] | null; error: unknown | null }>(() => ({ data: [], error: null }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockLt = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ lt: mockLt, order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn((table: string) => (table === 'crm_opportunities' ? { select: mockSelect } : {}))

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({
  captureApiError: vi.fn(),
  sanitiseError: (_e: unknown, msg: string) => msg,
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/founder/opportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
    mockLimit.mockReturnValue({ data: [], error: null })
  })

  it('returns 401 without allowing the authentication response to be cached', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect((await res.json()).error).toBe('Unauthorised')
  })

  it('scopes the query to the founder and returns opportunities + summary', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)
    mockLimit.mockReturnValue({
      data: [
        { id: 'o1', status: 'open', value_amount: 1000, probability: 50 },
        { id: 'o2', status: 'won', value_amount: 2000, probability: 100 },
        { id: 'o3', status: 'lost', value_amount: 500, probability: 0 },
      ],
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(mockEq).toHaveBeenCalledWith('founder_id', 'user-123')
    expect(body.opportunities).toHaveLength(3)
    expect(body.summary).toEqual({
      total: 3, open: 1, won: 1, lost: 1, openValue: 1000, weightedPipeline: 500,
    })
    expect(body.sourceOfTruth).toEqual({
      crm: 'crm_opportunities',
      billing: 'stripe',
      mode: 'forecast_only',
    })
    expect(body.readiness).toEqual({
      queueWindow: 'latest_500_created_at',
      pagination: 'cursor_by_created_at',
      latestOpportunityUpdatedAt: null,
      nextCursor: null,
    })
  })

  it('applies a before-created cursor and returns the next page cursor when the page is full', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)
    const page = Array.from({ length: 500 }, (_, index) => ({
      id: `o-${index}`,
      status: 'open',
      value_amount: 10,
      probability: 50,
      created_at: `2026-07-05T${String(23 - Math.floor(index / 25)).padStart(2, '0')}:${String(59 - (index % 25)).padStart(2, '0')}:00.000Z`,
      updated_at: index === 0 ? '2026-07-05T23:59:00.000Z' : null,
    }))
    page[499].created_at = '2026-07-04T00:00:00.000Z'
    mockLimit.mockReturnValue({ data: page, error: null })

    const res = await GET(new Request('https://unit.test/api/founder/opportunities?before=2026-07-05T12%3A00%3A00.000Z'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockLt).toHaveBeenCalledWith('created_at', '2026-07-05T12:00:00.000Z')
    expect(body.readiness.pagination).toBe('cursor_by_created_at')
    expect(body.readiness.nextCursor).toBe('2026-07-04T00:00:00.000Z')
  })

  it('rejects invalid before-created cursors without querying opportunities', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)

    const res = await GET(new Request('https://unit.test/api/founder/opportunities?before=not-a-date'))

    expect(res.status).toBe(400)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect((await res.json()).error).toBe('Invalid before cursor')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('marks the founder opportunities response as no-store', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('reports the latest opportunity update timestamp in readiness metadata', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)
    mockLimit.mockReturnValue({
      data: [
        { id: 'older', status: 'open', value_amount: 1000, probability: 25, updated_at: '2026-07-04T08:30:00.000Z' },
        { id: 'newer', status: 'open', value_amount: 2000, probability: 50, updated_at: '2026-07-05T08:45:00.000Z' },
      ],
      error: null,
    })

    const res = await GET()
    const body = await res.json()

    expect(body.readiness.latestOpportunityUpdatedAt).toBe('2026-07-05T08:45:00.000Z')
  })

  it('returns 500 with a sanitised no-store message when the query errors (no raw leak)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)
    mockLimit.mockReturnValue({ data: null, error: { message: 'pg connection refused at db.internal' } })

    const res = await GET()
    expect(res.status).toBe(500)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('Failed to load opportunities')
    expect(body.error).not.toContain('db.internal')
  })
})
