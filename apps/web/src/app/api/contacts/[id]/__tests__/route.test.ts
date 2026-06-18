import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock chain ───────────────────────────────────────────────────────
// GET  : from → select → eq(id) → eq(founder_id) → single
// PATCH: from → update → eq(id) → eq(founder_id) → select → single
// DELETE: from → delete → eq(id) → eq(founder_id)  [await the object directly]

const mockSingle = vi.fn()
const mockSelectAfterUpdate = vi.fn(() => ({ single: mockSingle }))

const mockEqFounder = vi.fn(() => ({
  single: mockSingle,
  select: mockSelectAfterUpdate,
  error: null,
}))
const mockEqId = vi.fn(() => ({ eq: mockEqFounder }))

const mockSelect = vi.fn(() => ({ eq: mockEqId }))
const mockUpdate = vi.fn(() => ({ eq: mockEqId }))
const mockDelete = vi.fn(() => ({ eq: mockEqId }))

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
}))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, PATCH, DELETE } from '../route'

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/contacts/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns 404 when contact does not exist', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const res = await GET(new Request('https://app.test/api/contacts/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns the contact scoped to founder_id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const contact = { id: 'c-1', first_name: 'Alice', founder_id: 'user-1' }
    mockSingle.mockResolvedValue({ data: contact, error: null })
    const res = await GET(new Request('https://app.test/api/contacts/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(contact)
    expect(mockEqFounder).toHaveBeenCalledWith('founder_id', 'user-1')
  })
})

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(
      new Request('https://app.test/api/contacts/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ first_name: 'Bob' }),
      }),
      { params: Promise.resolve({ id: 'c-1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid status value', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PATCH(
      new Request('https://app.test/api/contacts/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'hacker' }),
      }),
      { params: Promise.resolve({ id: 'c-1' }) },
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid status' })
  })

  it('strips non-allowed fields and updates the contact', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const updated = { id: 'c-1', first_name: 'Bob', status: 'client' }
    mockSingle.mockResolvedValue({ data: updated, error: null })
    const res = await PATCH(
      new Request('https://app.test/api/contacts/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ first_name: 'Bob', status: 'client', secret: 'ignored' }),
      }),
      { params: Promise.resolve({ id: 'c-1' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
    const updatePayload = mockUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(updatePayload).not.toHaveProperty('secret')
    expect(updatePayload).toHaveProperty('first_name', 'Bob')
  })
})

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(new Request('https://app.test/api/contacts/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('deletes the contact and returns { deleted: true }', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await DELETE(new Request('https://app.test/api/contacts/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true })
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEqFounder).toHaveBeenCalledWith('founder_id', 'user-1')
  })
})
