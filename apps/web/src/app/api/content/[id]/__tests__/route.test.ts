import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
let deleteResolve: any = { error: null }

function makeReadChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.update.mockReturnValue(b)
  b.delete.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

function makeDeleteChain() {
  const b: Record<string, any> = {
    delete: vi.fn(),
    eq: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(deleteResolve).then(onFulfilled, onRejected)
    },
  }
  b.delete.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  return b
}

const mockFromImpl = vi.fn()
const mockServiceClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, PATCH, DELETE } from '../route'

const params = Promise.resolve({ id: 'content-1' })

describe('GET /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromImpl.mockReturnValue(makeReadChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when content not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(404)
  })

  it('returns content', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'content-1', title: 'Post 1' }, error: null })

    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content.id).toBe('content-1')
  })
})

describe('PATCH /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromImpl.mockReturnValue(makeReadChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(new Request('https://app.test', { method: 'PATCH', body: '{}' }), { params })
    expect(res.status).toBe(401)
  })

  it('updates content and returns it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'content-1', status: 'approved' }, error: null })

    const res = await PATCH(
      new Request('https://app.test', { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
      { params }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content.status).toBe('approved')
  })
})

describe('DELETE /api/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    mockFromImpl.mockReturnValue(makeDeleteChain())
    const res = await DELETE(new Request('https://app.test'), { params })
    expect(res.status).toBe(401)
  })

  it('deletes content and returns success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    deleteResolve = { error: null }
    mockFromImpl.mockReturnValue(makeDeleteChain())

    const res = await DELETE(new Request('https://app.test'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('deleted')
  })

  it('returns 500 on delete error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    deleteResolve = { error: { message: 'delete failed' } }
    mockFromImpl.mockReturnValue(makeDeleteChain())

    const res = await DELETE(new Request('https://app.test'), { params })
    expect(res.status).toBe(500)
  })
})
