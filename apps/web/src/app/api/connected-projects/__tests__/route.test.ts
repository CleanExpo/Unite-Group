import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSingle = vi.fn()
let listResolve: any = { data: [], error: null }

function makeListChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(listResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  return b
}

function makeUpsertChain() {
  const b: Record<string, any> = {
    upsert: vi.fn(),
    select: vi.fn(),
  }
  b.upsert.mockReturnValue(b)
  b.select.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

const mockFromImpl = vi.fn()
const mockClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/error-reporting', () => ({ captureApiError: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'

describe('GET /api/connected-projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listResolve = { data: [], error: null }
    mockFromImpl.mockReturnValue(makeListChain())
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns satellites list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    listResolve = { data: [{ id: 'sat-1', business_key: 'dr' }], error: null }

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.satellites).toHaveLength(1)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    listResolve = { data: null, error: { message: 'DB error' } }

    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/connected-projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromImpl.mockReturnValue(makeUpsertChain())
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new NextRequest('https://app.test', { method: 'POST', body: JSON.stringify({ businessKey: 'dr' }) }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when businessKey is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(new NextRequest('https://app.test', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown businessKey', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(new NextRequest('https://app.test', {
      method: 'POST',
      body: JSON.stringify({ businessKey: 'unknown-biz' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown business/)
  })

  it('returns 400 for client-type business', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(new NextRequest('https://app.test', {
      method: 'POST',
      body: JSON.stringify({ businessKey: 'ccw' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/client project/)
  })

  it('upserts satellite and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const satellite = { id: 'sat-1', business_key: 'dr', business_name: 'Disaster Recovery' }
    mockSingle.mockResolvedValue({ data: satellite, error: null })

    const res = await POST(new NextRequest('https://app.test', {
      method: 'POST',
      body: JSON.stringify({ businessKey: 'dr', repoUrl: 'https://github.com/org/dr' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.business_key).toBe('dr')
  })
})
