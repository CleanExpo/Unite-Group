import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLimit = vi.fn(() => ({ data: [], error: null }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockEq = vi.fn(() => ({ order: mockOrder }))
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

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(401)
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
  })

  it('returns 500 with a sanitised message when the query errors (no raw leak)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any)
    mockLimit.mockReturnValue({ data: null, error: { message: 'pg connection refused at db.internal' } })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load opportunities')
    expect(body.error).not.toContain('db.internal')
  })
})
