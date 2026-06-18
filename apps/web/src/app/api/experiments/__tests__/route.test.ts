import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// GET  : from('experiments') → fluent chain → order() [terminal, returns { data, error }]
// POST : from('experiments') → insert → select → single
//      : from('experiment_variants') → insert → select [terminal, returns { data, error }]

const mockSingle = vi.fn()
const mockInsertSelectSingle = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelectSingle }))

const mockVariantsInsertSelect = vi.fn()
const mockVariantsInsert = vi.fn(() => ({ select: mockVariantsInsertSelect }))

const mockOrder = vi.fn()

function makeGetChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: mockOrder,
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  return b
}

let getChain: ReturnType<typeof makeGetChain>
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getChain = makeGetChain()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'experiments') return { ...getChain, insert: mockInsert }
      if (table === 'experiment_variants') return { insert: mockVariantsInsert }
      return {}
    })
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new NextRequest('https://app.test/api/experiments'))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns experiments list for authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const exps = [{ id: 'e-1', title: 'Test A/B' }]
    mockOrder.mockResolvedValue({ data: exps, error: null })

    const res = await GET(new NextRequest('https://app.test/api/experiments'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.experiments).toEqual(exps)
    expect(getChain.eq).toHaveBeenCalledWith('founder_id', 'user-1')
  })

  it('returns 500 when DB fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET(new NextRequest('https://app.test/api/experiments'))
    expect(res.status).toBe(500)
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getChain = makeGetChain()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'experiments') return { ...getChain, insert: mockInsert }
      if (table === 'experiment_variants') return { insert: mockVariantsInsert }
      return {}
    })
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(
      new NextRequest('https://app.test/api/experiments', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(
      new NextRequest('https://app.test/api/experiments', {
        method: 'POST',
        body: JSON.stringify({ hypothesis: 'test', businessKey: 'synthex', experimentType: 'content', metricPrimary: 'clicks' }),
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'title is required' })
  })

  it('returns 400 for an unknown businessKey', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(
      new NextRequest('https://app.test/api/experiments', {
        method: 'POST',
        body: JSON.stringify({
          title: 'My Test',
          hypothesis: 'H1',
          businessKey: 'nonexistent',
          experimentType: 'content',
          metricPrimary: 'clicks',
        }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown business/)
  })

  it('creates an experiment and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const created = { id: 'e-new', title: 'My Test', status: 'draft' }
    mockSingle.mockResolvedValue({ data: created, error: null })

    const res = await POST(
      new NextRequest('https://app.test/api/experiments', {
        method: 'POST',
        body: JSON.stringify({
          title: 'My Test',
          hypothesis: 'H1',
          businessKey: 'synthex',
          experimentType: 'social_copy',
          metricPrimary: 'clicks',
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.experiment).toEqual(created)
    expect(body.variants).toEqual([])
  })
})
