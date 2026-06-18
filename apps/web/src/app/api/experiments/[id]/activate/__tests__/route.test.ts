import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock chain ────────────────────────────────────────────────────────────────
// POST sequence:
//   1. from('experiments').select().eq().eq().single()         — fetch experiment
//   2. from('experiment_variants').select().eq().eq()          — fetch variants list
//   3. from('social_posts').insert({})                         — per variant (if content)
//   4. from('approval_queue').insert({}).select('id').single() — create approval
//   5. from('experiments').update({}).eq().eq()                — set status=active

const mockSingle = vi.fn()

// Chainable builder factory — all methods return self; single() is the terminal.
function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.insert.mockReturnValue(b)
  b.update.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

// Per-call variant fetch returns a list (not .single())
const mockVariantsEq = vi.fn()
const mockVariantsSelect = vi.fn(() => ({ eq: mockVariantsEq }))
mockVariantsEq.mockImplementation(() => ({ eq: vi.fn(() => mockVariantsEq) }))

// social_posts insert (fire-and-forget, no .single())
const mockPostsInsert = vi.fn(() => ({ error: null }))

let expChain: ReturnType<typeof makeChain>
let approvalChain: ReturnType<typeof makeChain>

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

function buildFrom(variants: unknown[] | null, variantsError?: object) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'experiments') return expChain
    if (table === 'experiment_variants') {
      const eqFounder = vi.fn(() => ({ data: variants, error: variantsError ?? null }))
      const eqExp = vi.fn(() => ({ eq: eqFounder }))
      return { select: vi.fn(() => ({ eq: eqExp })) }
    }
    if (table === 'social_posts') return { insert: mockPostsInsert }
    if (table === 'approval_queue') return approvalChain
    return {}
  })
}

describe('POST /api/experiments/[id]/activate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    expChain = makeChain()
    approvalChain = makeChain()
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    buildFrom([])
    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when experiment is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    buildFrom([])
    const res = await POST(new Request('https://app.test/api/experiments/missing/activate'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when experiment is not in draft status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'e-1', status: 'active', title: 'T', hypothesis: 'H', business_key: 'synthex' }, error: null })
    buildFrom([])
    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/must be draft/)
  })

  it('returns 400 when fewer than 2 variants exist', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'e-1', status: 'draft', title: 'T', hypothesis: 'H', business_key: 'synthex' }, error: null })
    buildFrom([{ id: 'v-1', is_control: true, weight: 1.0, content: null }])
    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/At least 2 variants/)
  })

  it('returns 400 when no control variant exists', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'e-1', status: 'draft', title: 'T', hypothesis: 'H', business_key: 'synthex' }, error: null })
    buildFrom([
      { id: 'v-1', is_control: false, weight: 0.5, content: null },
      { id: 'v-2', is_control: false, weight: 0.5, content: null },
    ])
    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/control/)
  })

  it('returns 400 when variant weights do not sum to ~1.0', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'e-1', status: 'draft', title: 'T', hypothesis: 'H', business_key: 'synthex' }, error: null })
    buildFrom([
      { id: 'v-1', is_control: true, weight: 0.3, content: null },
      { id: 'v-2', is_control: false, weight: 0.3, content: null },
    ])
    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/weights must sum/)
  })

  it('activates the experiment and returns approval id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const experiment = { id: 'e-1', status: 'draft', title: 'T', hypothesis: 'H', business_key: 'synthex' }
    const approvalId = 'approval-99'

    // single() calls: 1=fetch experiment, 2=insert approval
    mockSingle
      .mockResolvedValueOnce({ data: experiment, error: null })
      .mockResolvedValueOnce({ data: { id: approvalId }, error: null })

    const variants = [
      { id: 'v-1', is_control: true, weight: 0.5, content: 'Hello', platforms: [] },
      { id: 'v-2', is_control: false, weight: 0.5, content: null, platforms: [] },
    ]

    // Use a call counter so the first from('experiments') goes to the fetch chain
    // and the second goes to the update chain (which doesn't need .single())
    let expCallCount = 0
    const updateEq2 = vi.fn(() => ({ error: null }))
    const updateEq1 = vi.fn(() => ({ eq: updateEq2 }))
    const updateChain = { update: vi.fn(() => ({ eq: updateEq1 })) }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'experiments') {
        expCallCount++
        return expCallCount === 1 ? expChain : updateChain
      }
      if (table === 'experiment_variants') {
        const eqFounder = vi.fn(() => ({ data: variants, error: null }))
        const eqExp = vi.fn(() => ({ eq: eqFounder }))
        return { select: vi.fn(() => ({ eq: eqExp })) }
      }
      if (table === 'social_posts') return { insert: mockPostsInsert }
      if (table === 'approval_queue') return approvalChain
      return {}
    })

    const res = await POST(new Request('https://app.test/api/experiments/e-1/activate'), {
      params: Promise.resolve({ id: 'e-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Experiment activated')
    expect(body.approvalId).toBe(approvalId)
    expect(body.postsCreated).toBe(1) // only v-1 has content
  })
})
