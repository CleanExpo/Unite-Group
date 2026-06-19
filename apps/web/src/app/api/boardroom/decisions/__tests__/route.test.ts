import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.insert.mockReturnValue(b)
  b.order.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'

describe('GET /api/boardroom/decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/boardroom/decisions'))
    expect(res.status).toBe(401)
  })

  it('returns decisions list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'd-1', title: 'Buy equipment' }], error: null }

    const res = await GET(new Request('https://app.test/api/boardroom/decisions'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.decisions).toHaveLength(1)
  })

  it('filters by type and status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [], error: null }

    const res = await GET(new Request('https://app.test/api/boardroom/decisions?type=strategic&status=open'))
    expect(res.status).toBe(200)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: null, error: { message: 'DB error' } }

    const res = await GET(new Request('https://app.test/api/boardroom/decisions'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/boardroom/decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: null, error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test/api/boardroom/decisions', {
      method: 'POST',
      body: JSON.stringify({ title: 'Buy server', type: 'strategic' }),
    }))
    expect(res.status).toBe(401)
  })

  it('creates a decision and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const created = { id: 'd-1', title: 'Buy server', type: 'strategic' }
    mockSingle.mockResolvedValue({ data: created, error: null })

    const res = await POST(new Request('https://app.test/api/boardroom/decisions', {
      method: 'POST',
      body: JSON.stringify({ title: 'Buy server', type: 'strategic', rationale: 'Need capacity' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.decision.id).toBe('d-1')
  })

  it('returns 500 on insert error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const res = await POST(new Request('https://app.test/api/boardroom/decisions', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', type: 'tactical' }),
    }))
    expect(res.status).toBe(500)
  })
})
