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

vi.mock('@/lib/advisory/xero-bridge', () => ({
  executeAdvisoryAction: vi.fn().mockResolvedValue({
    status: 'advisory_only',
    xeroEntryId: null,
    message: 'Xero not connected',
  }),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

const params = Promise.resolve({ id: 'case-1' })

describe('POST /api/advisory/cases/[id]/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when case is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockFromImpl.mockReturnValue(makeChain())

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 when case is not approved', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'case-1', status: 'draft', winning_firm: 'pwc', approval_queue_id: null, financial_context: {} }, error: null })
    mockFromImpl.mockReturnValue(makeChain())

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when no winning firm', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'case-1', status: 'approved', winning_firm: null, approval_queue_id: null, financial_context: {} }, error: null })
    mockFromImpl.mockReturnValue(makeChain())

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(409)
  })

  it('executes the case and returns 200 with xero status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)

    const caseRow = { id: 'case-1', status: 'approved', winning_firm: 'pwc', approval_queue_id: null, financial_context: { businessKey: 'dr' } }
    const proposal = { id: 'p-1', firm_key: 'pwc', round: 5, structured_data: { strategies: [] } }
    const executedCase = { ...caseRow, status: 'executed' }

    mockSingle
      .mockResolvedValueOnce({ data: caseRow, error: null })    // case lookup
      .mockResolvedValueOnce({ data: proposal, error: null })   // proposal lookup
      .mockResolvedValueOnce({ data: executedCase, error: null }) // update

    const caseChain = makeChain()
    const proposalChain = makeChain()
    const updateChain = makeChain()

    let callIndex = 0
    mockFromImpl.mockImplementation((table: string) => {
      if (table === 'advisory_proposals') return proposalChain
      return caseChain
    })

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.xero.status).toBe('advisory_only')
  })
})
