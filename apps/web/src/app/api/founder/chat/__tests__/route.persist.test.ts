import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockSelectAfterUpsert = vi.fn(() => ({ single: mockSingle }))
const mockUpsert = vi.fn(() => ({ select: mockSelectAfterUpsert }))
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn((table: string) => {
  if (table !== 'founder_chat_threads') return {}
  return { select: mockSelect, upsert: mockUpsert }
})

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/error-reporting', () => ({
  sanitiseError: (_e: unknown, msg: string) => msg,
}))
vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn() }))
vi.mock('@/lib/site-agent/grounding', () => ({
  ground: vi.fn(),
  formatGroundingContext: vi.fn(() => ''),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, PUT } from '../route'

describe('GET /api/founder/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never)
    mockMaybeSingle.mockResolvedValue({
      data: {
        messages: [{ role: 'user', content: 'hello' }],
        business_key: 'carsi',
        updated_at: '2026-08-06T14:00:00.000Z',
      },
      error: null,
    })
  })

  it('returns 401 no-store when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('loads the founder-scoped thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockEq).toHaveBeenCalledWith('founder_id', 'user-123')
    await expect(res.json()).resolves.toEqual({
      messages: [{ role: 'user', content: 'hello' }],
      businessKey: 'carsi',
      updatedAt: '2026-08-06T14:00:00.000Z',
    })
  })
})

describe('PUT /api/founder/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never)
    mockSingle.mockResolvedValue({
      data: {
        messages: [{ role: 'user', content: 'persist me' }],
        business_key: null,
        updated_at: '2026-08-06T14:05:00.000Z',
      },
      error: null,
    })
  })

  it('upserts the founder thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    const res = await PUT(
      new Request('https://unit.test/api/founder/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'persist me' }],
          businessKey: null,
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        founder_id: 'user-123',
        messages: [{ role: 'user', content: 'persist me' }],
        business_key: null,
      }),
      { onConflict: 'founder_id' },
    )
    await expect(res.json()).resolves.toMatchObject({
      messages: [{ role: 'user', content: 'persist me' }],
      businessKey: null,
    })
  })

  it('rejects invalid payloads without writing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    const res = await PUT(
      new Request('https://unit.test/api/founder/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'bot', content: 'x' }] }),
      }),
    )
    expect(res.status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
  })
})
