import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSingle = vi.fn()
let chainResolve: any = { data: [], count: 0, error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.insert.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.range.mockReturnValue(b)
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

vi.mock('@/lib/advisory/financial-context', () => ({
  collectFinancialContext: vi.fn().mockResolvedValue({ businessKey: 'dr' }),
}))

vi.mock('@/lib/error-reporting', () => ({
  captureApiError: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'

function getReq(qs = '') {
  return new NextRequest(`https://app.test/api/advisory/cases${qs}`)
}

function postReq(body: object) {
  return new NextRequest('https://app.test/api/advisory/cases', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/advisory/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], count: 0, error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('returns paginated cases list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'case-1', title: 'Tax opt' }], count: 5, error: null }

    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cases).toHaveLength(1)
    expect(body.total).toBe(5)
  })

  it('filters by status when valid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [], count: 0, error: null }

    const res = await GET(getReq('?status=draft'))
    expect(res.status).toBe(200)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: null, count: null, error: { message: 'DB error' } }

    const res = await GET(getReq())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/advisory/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: null, error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ title: 'T', scenario: 'S', businessKey: 'dr' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when title/scenario/businessKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ title: 'Test' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('required') })
  })

  it('returns 400 for unknown business key', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ title: 'T', scenario: 'S', businessKey: 'nope' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Unknown business') })
  })

  it('creates a case and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const created = { id: 'case-1', title: 'Tax Opt', status: 'draft', current_round: 0 }
    mockSingle.mockResolvedValue({ data: created, error: null })

    const res = await POST(postReq({ title: 'Tax Opt', scenario: 'Reduce PAYG', businessKey: 'dr' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('case-1')
  })

  it('returns 500 on insert error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const res = await POST(postReq({ title: 'Test', scenario: 'Scenario', businessKey: 'dr' }))
    expect(res.status).toBe(500)
  })
})
