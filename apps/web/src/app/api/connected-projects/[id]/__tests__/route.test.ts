import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSingle = vi.fn()

function makeUpdateChain() {
  const b: Record<string, any> = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
  }
  b.update.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.select.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/error-reporting', () => ({ captureApiError: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { PATCH } from '../route'

const params = Promise.resolve({ id: 'sat-1' })

function patchReq(body: object) {
  return new NextRequest('https://app.test/api/connected-projects/sat-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/connected-projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeUpdateChain())
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(patchReq({ notes: 'New note' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid fields provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PATCH(patchReq({ unknownField: 'val' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No valid fields/)
  })

  it('updates satellite and returns 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const updated = { id: 'sat-1', notes: 'Updated note', stack: 'Next.js' }
    mockSingle.mockResolvedValue({ data: updated, error: null })

    const res = await PATCH(patchReq({ notes: 'Updated note', stack: 'Next.js' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notes).toBe('Updated note')
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    const res = await PATCH(patchReq({ healthStatus: 'green' }), { params })
    expect(res.status).toBe(500)
  })
})
