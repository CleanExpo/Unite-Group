import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock chain ────────────────────────────────────────────────────────────────
// POST sequence:
//   1. from('experiments').select('id, status').eq().eq().single() — fetch
//   2. from('experiments').update({...}).eq().eq().select().single() — complete

const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.update.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

describe('POST /api/experiments/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(
      new Request('https://app.test/api/experiments/e-1/complete', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when experiment is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await POST(
      new Request('https://app.test/api/experiments/missing/complete', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when experiment status is draft (not active/paused)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValueOnce({ data: { id: 'e-1', status: 'draft' }, error: null })
    const res = await POST(
      new Request('https://app.test/api/experiments/e-1/complete', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/must be active or paused/)
  })

  it('completes an active experiment and returns it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const completed = { id: 'e-1', status: 'completed', conclusion: 'Variant B wins' }
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'e-1', status: 'active' }, error: null })
      .mockResolvedValueOnce({ data: completed, error: null })

    const res = await POST(
      new Request('https://app.test/api/experiments/e-1/complete', {
        method: 'POST',
        body: JSON.stringify({ conclusion: 'Variant B wins', winnerVariantId: 'v-2' }),
      }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ experiment: completed })
  })

  it('completes a paused experiment', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const completed = { id: 'e-1', status: 'completed' }
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'e-1', status: 'paused' }, error: null })
      .mockResolvedValueOnce({ data: completed, error: null })

    const res = await POST(
      new Request('https://app.test/api/experiments/e-1/complete', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: 'e-1' }) },
    )
    expect(res.status).toBe(200)
  })
})
