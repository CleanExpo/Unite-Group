import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

const mockChannelSend = vi.fn().mockResolvedValue(undefined)
const mockRemoveChannel = vi.fn()
const mockChannel = {
  subscribe: vi.fn((cb) => { cb('SUBSCRIBED') }),
  send: mockChannelSend,
}
const mockFrom = vi.fn()
const mockServiceClient = {
  from: mockFrom,
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
}

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/advisory/debate-engine', () => ({
  runDebate: vi.fn(() => (async function* () {})()),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const params = Promise.resolve({ id: 'case-1' })

describe('POST /api/advisory/cases/[id]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when case is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 when case is not in draft status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'case-1', status: 'pending_review', founder_id: 'user-1' }, error: null })

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(409)
  })

  it('returns 200 after successful debate', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'case-1', status: 'draft', founder_id: 'user-1' }, error: null })

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caseId).toBe('case-1')
  })
})
