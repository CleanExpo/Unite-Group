import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ sanitiseError: vi.fn(() => 'sanitised-message') }))

import { NextRequest } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

const single = vi.fn()
const insert = vi.fn()

function makeClient() {
  const chain = { insert, select: vi.fn(() => chain), single }
  insert.mockReturnValue(chain)
  return { from: vi.fn(() => chain) }
}

function req(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/brand-video/generate', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/brand-video/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(createClient).mockResolvedValue(makeClient() as never)
    single.mockResolvedValue({ data: { id: 'job-1', status: 'queued' }, error: null })
  })

  it('refuses unauthenticated requests and writes nothing', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ brand: 'B', topic: 'T' }))
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON with 400', async () => {
    const res = await POST(req('{not json', true))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects missing topic with 400', async () => {
    const res = await POST(req({ brand: 'B' }))
    expect(res.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects out-of-range count and unknown style with 400', async () => {
    expect((await POST(req({ brand: 'B', topic: 'T', count: 11 }))).status).toBe(400)
    expect((await POST(req({ brand: 'B', topic: 'T', style: 'no-such-style' }))).status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  it('queues a job owned by the caller and returns 201', async () => {
    const res = await POST(req({ brand: '  Acme  ', topic: 'Launch', count: '3' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ jobId: 'job-1', status: 'queued' })
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'Acme',
        topic: 'Launch',
        count: 3,
        status: 'queued',
        created_by: 'user-123',
      }),
    )
  })

  it('returns 500 with a sanitised message when the insert fails', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'db secret detail' } })
    const res = await POST(req({ brand: 'B', topic: 'T' }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('db secret detail')
  })
})
