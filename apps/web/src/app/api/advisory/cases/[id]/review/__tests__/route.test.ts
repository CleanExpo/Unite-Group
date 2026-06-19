import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const mockFromImpl = vi.fn()
const mockClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

const params = Promise.resolve({ id: 'case-1' })

function req(body: object) {
  return new Request('https://app.test/api/advisory/cases/case-1/review', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/advisory/cases/[id]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ decision: 'approved', reviewedBy: 'Joe' }) as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 when decision is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ decision: 'maybe', reviewedBy: 'Joe' }) as any, { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when reviewedBy is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ decision: 'approved' }) as any, { params })
    expect(res.status).toBe(400)
  })

  it('returns 404 when case not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const chain = makeChain()
    mockFromImpl.mockReturnValue(chain)

    const res = await POST(req({ decision: 'approved', reviewedBy: 'Joe' }) as any, { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 when case is not pending_review', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'case-1', status: 'draft', approval_queue_id: null }, error: null })
    const chain = makeChain()
    mockFromImpl.mockReturnValue(chain)

    const res = await POST(req({ decision: 'approved', reviewedBy: 'Joe' }) as any, { params })
    expect(res.status).toBe(409)
  })

  it('approves the case and returns 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const caseRow = { id: 'case-1', status: 'pending_review', approval_queue_id: null }
    const updated = { ...caseRow, status: 'approved', reviewed_by: 'Joe' }

    mockSingle
      .mockResolvedValueOnce({ data: caseRow, error: null })  // lookup
      .mockResolvedValueOnce({ data: updated, error: null })   // update

    const caseLookupChain = makeChain()
    const updateChain = makeChain()
    mockFromImpl.mockReturnValue(caseLookupChain)

    const res = await POST(req({ decision: 'approved', reviewedBy: 'Joe', notes: 'LGTM' }) as any, { params })
    expect(res.status).toBe(200)
  })

  it('returns 500 on update error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const caseRow = { id: 'case-1', status: 'pending_review', approval_queue_id: null }

    mockSingle
      .mockResolvedValueOnce({ data: caseRow, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })

    const chain = makeChain()
    mockFromImpl.mockReturnValue(chain)

    const res = await POST(req({ decision: 'rejected', reviewedBy: 'Joe' }) as any, { params })
    expect(res.status).toBe(500)
  })
})
