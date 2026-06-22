import { describe, it, expect, vi, beforeEach } from 'vitest'

// The atomic claim is `update({status:'debating'}).eq(id).eq(founder).eq(status='draft')
// .select().single()` — exactly one concurrent caller wins the row; the rest get
// no row back and must return 409 (Step 4 / F3 — double-start TOCTOU race).
const mockClaimSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.update.mockReturnValue(b)
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as Record<string, unknown>).single = mockClaimSingle
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

const mockRunDebate = vi.fn(() => (async function* () {})())
vi.mock('@/lib/advisory/debate-engine', () => ({
  runDebate: (...a: unknown[]) => mockRunDebate(...a),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const params = Promise.resolve({ id: 'case-1' })

describe('POST /api/advisory/cases/[id]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never)
    mockRunDebate.mockImplementation(() => (async function* () {})())
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test') as never, { params })
    expect(res.status).toBe(401)
  })

  it('returns 409 when the atomic claim yields no row (not draft / already claimed)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    // No row returned → the case was not in draft (or another caller claimed it).
    mockClaimSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } })

    const res = await POST(new Request('https://app.test') as never, { params })
    expect(res.status).toBe(409)
    expect(mockRunDebate).not.toHaveBeenCalled()
  })

  it('returns 200 and runs the debate when the claim succeeds', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)
    mockClaimSingle.mockResolvedValue({ data: { id: 'case-1', status: 'debating', founder_id: 'user-1' }, error: null })

    const res = await POST(new Request('https://app.test') as never, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caseId).toBe('case-1')
    expect(mockRunDebate).toHaveBeenCalledTimes(1)
  })

  it('two concurrent POSTs → exactly one 200 and one 409; the debate runs once', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)

    // Atomic claim: the first caller to reach the UPDATE wins the row; the second
    // sees the row already moved off 'draft' and gets nothing back.
    let claimed = false
    mockClaimSingle.mockImplementation(async () => {
      if (!claimed) {
        claimed = true
        return { data: { id: 'case-1', status: 'debating', founder_id: 'user-1' }, error: null }
      }
      return { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    })

    const [a, b] = await Promise.all([
      POST(new Request('https://app.test') as never, { params }),
      POST(new Request('https://app.test') as never, { params }),
    ])

    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(mockRunDebate).toHaveBeenCalledTimes(1)
  })
})
