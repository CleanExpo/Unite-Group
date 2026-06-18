import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared mock single ────────────────────────────────────────────────────────
const mockSingle = vi.fn()

// fluent chain that ends in .single()
function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.update.mockReturnValue(b)
  b.delete.mockReturnValue(b)
  // terminal: single() or direct await (for delete)
  ;(b as any).single = mockSingle
  ;(b as any).then = undefined  // ensure it's not auto-awaited
  return b
}

let expChain: ReturnType<typeof makeChain>
let varChain: ReturnType<typeof makeChain>
let resChain: ReturnType<typeof makeChain>

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, PATCH, DELETE } from '../route'

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    expChain = makeChain()
    varChain = makeChain()
    resChain = makeChain()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'experiments') return expChain
      if (table === 'experiment_variants') return varChain
      if (table === 'experiment_results') return resChain
      return {}
    })
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
    // Per-test setup: configure terminal behaviour in each test, not here.
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/experiments/e-1'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when experiment is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await GET(new Request('https://app.test/api/experiments/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns experiment with variants and aggregated results', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const experiment = { id: 'e-1', title: 'Test', status: 'active' }
    const variants = [{ id: 'v-1', is_control: true, weight: 0.5 }, { id: 'v-2', is_control: false, weight: 0.5 }]
    const results = [{ variant_id: 'v-1', impressions: 100, clicks: 10, likes: 5, comments: 0, shares: 0, saves: 0, conversions: 2 }]

    // Experiment fetch
    mockSingle.mockResolvedValueOnce({ data: experiment, error: null })
    // variants: first .order() → chain, second .order() → data
    varChain.order.mockReturnValueOnce(varChain)
    varChain.order.mockReturnValueOnce({ data: variants, error: null })
    // results: first .eq() → chain, second .eq() → data
    resChain.eq.mockReturnValueOnce(resChain)
    resChain.eq.mockReturnValueOnce({ data: results, error: null })

    const res = await GET(new Request('https://app.test/api/experiments/e-1'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.experiment).toEqual(experiment)
    expect(body.variants).toEqual(variants)
    expect(body.results['v-1'].totalImpressions).toBe(100)
    expect(body.results['v-1'].totalClicks).toBe(10)
  })
})

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    expChain = makeChain()
    mockFrom.mockImplementation(() => expChain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(
      new Request('https://app.test/api/experiments/e-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
      }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when no fields to update', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    // First single = fetch current status
    mockSingle.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    const res = await PATCH(
      new Request('https://app.test/api/experiments/e-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'No fields to update' })
  })

  it('returns 400 for invalid status transition (draft → completed)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
    const res = await PATCH(
      new Request('https://app.test/api/experiments/e-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Cannot transition/)
  })

  it('updates title and returns the experiment', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const updated = { id: 'e-1', title: 'New Title', status: 'draft' }
    mockSingle
      .mockResolvedValueOnce({ data: { status: 'draft' }, error: null }) // fetch
      .mockResolvedValueOnce({ data: updated, error: null })              // update result
    const res = await PATCH(
      new Request('https://app.test/api/experiments/e-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
      }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ experiment: updated })
  })
})

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    expChain = makeChain()
    // delete().eq().eq() → awaitable object with { error }
    expChain.delete.mockReturnValue({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) })
    mockFrom.mockImplementation(() => expChain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(new Request('https://app.test/api/experiments/e-1'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when experiment is not in draft status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { status: 'active' }, error: null })
    const res = await DELETE(new Request('https://app.test/api/experiments/e-1'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Only draft experiments can be deleted' })
  })

  it('deletes a draft experiment and returns 204', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { status: 'draft' }, error: null })
    const res = await DELETE(new Request('https://app.test/api/experiments/e-1'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(204)
  })
})
