import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PATCH, DELETE } from '../route'

let mockSingleResult: any = { data: null, error: null }

function makeChain() {
  const b: Record<string, any> = {
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  b.update.mockReturnValue(b)
  b.select.mockReturnValue(b)
  b.delete.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  // Dynamic: reads mockSingleResult at call time
  b.single.mockImplementation(() => Promise.resolve(mockSingleResult))
  return b
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

function patchReq(id: string, body: object) {
  return new NextRequest(`https://app.test/api/social/posts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteReq(id: string) {
  return new Request(`https://app.test/api/social/posts/${id}`, { method: 'DELETE' })
}

describe('PATCH /api/social/posts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingleResult = { data: null, error: null }
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(makeChain()) } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(patchReq('p-1', { title: 'New title' }), ctx('p-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid fields provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PATCH(patchReq('p-1', { unknown_field: 'value' }), ctx('p-1'))
    expect(res.status).toBe(400)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingleResult = { data: null, error: { message: 'db error' } }
    const res = await PATCH(patchReq('p-1', { title: 'New title' }), ctx('p-1'))
    expect(res.status).toBe(500)
  })

  it('returns 200 with updated post', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingleResult = { data: { id: 'p-1', title: 'New title', status: 'draft' }, error: null }
    const res = await PATCH(patchReq('p-1', { title: 'New title' }), ctx('p-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.post.title).toBe('New title')
  })
})

describe('DELETE /api/social/posts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(deleteReq('p-1'), ctx('p-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when post not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: null })
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any)
    const res = await DELETE(deleteReq('p-1'), ctx('p-1'))
    expect(res.status).toBe(404)
  })

  it('returns 400 when post is not a draft', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { status: 'published' }, error: null })
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as any)
    const res = await DELETE(deleteReq('p-1'), ctx('p-1'))
    expect(res.status).toBe(400)
  })

  it('returns 204 on successful delete', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    // First from('social_posts'): select chain to check status
    const selectChain = makeChain()
    selectChain.single.mockResolvedValue({ data: { status: 'draft' }, error: null })
    // Second from('social_posts'): delete chain (no terminal single())
    const deleteChain: Record<string, any> = {
      delete: vi.fn(),
      eq: vi.fn(),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve({ error: null }).then(onFulfilled, onRejected),
    }
    deleteChain.delete.mockReturnValue(deleteChain)
    deleteChain.eq.mockReturnValue(deleteChain)
    const mockFrom = vi.fn()
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(deleteChain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
    const res = await DELETE(deleteReq('p-1'), ctx('p-1'))
    expect(res.status).toBe(204)
  })
})
