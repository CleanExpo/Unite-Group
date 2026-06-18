import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock chain ───────────────────────────────────────────────────────
// GET: from → select → eq(founder_id) → eq(id) → eq(is_deleted) → single

const mockSingle = vi.fn()
const mockEqDeleted = vi.fn(() => ({ single: mockSingle }))
const mockEqId = vi.fn(() => ({ eq: mockEqDeleted }))
const mockEqFounder = vi.fn(() => ({ eq: mockEqId }))
const mockSelect = vi.fn(() => ({ eq: mockEqFounder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/knowledge/notes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/knowledge/notes/n-1'), {
      params: Promise.resolve({ id: 'n-1' }),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns 404 for PGRST116 (row not found)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const res = await GET(new Request('https://app.test/api/knowledge/notes/n-missing'), {
      params: Promise.resolve({ id: 'n-missing' }),
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'Note not found' })
  })

  it('returns 500 for other database errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { code: '42P01', message: 'Table missing' } })
    const res = await GET(new Request('https://app.test/api/knowledge/notes/n-1'), {
      params: Promise.resolve({ id: 'n-1' }),
    })
    expect(res.status).toBe(500)
  })

  it('returns the note scoped to founder_id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const note = { id: 'n-1', title: 'My Note', founder_id: 'user-1', is_deleted: false }
    mockSingle.mockResolvedValue({ data: note, error: null })
    const res = await GET(new Request('https://app.test/api/knowledge/notes/n-1'), {
      params: Promise.resolve({ id: 'n-1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(note)
    expect(mockEqFounder).toHaveBeenCalledWith('founder_id', 'user-1')
  })
})
