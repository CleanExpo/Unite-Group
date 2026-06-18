import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn()
const mockSelectForUpdate = vi.fn(() => ({ single: mockSingle }))
const mockEqFounder = vi.fn(() => ({
  single: mockSingle,
  select: mockSelectForUpdate,
}))
const mockEqId = vi.fn(() => ({ eq: mockEqFounder }))
const mockSelect = vi.fn(() => ({ eq: mockEqId }))
const mockUpdate = vi.fn(() => ({ eq: mockEqId }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/crm/qualify-lead', () => ({
  qualifyLead: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { qualifyLead } from '@/lib/crm/qualify-lead'
import { POST } from '../route'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/contacts/[id]/score', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test/api/contacts/c-1/score'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns 404 when contact is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const res = await POST(new Request('https://app.test/api/contacts/c-1/score'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(404)
  })

  it('scores the contact and persists the result in metadata', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const contact = {
      id: 'c-1',
      email: 'alice@example.com',
      phone: '0412345678',
      company: 'Acme',
      role: 'CEO',
      metadata: { source: 'website' },
    }
    const qualifyResult = { score: 85, tier: 'hot', signals: ['email', 'phone'] }
    const updatedContact = {
      id: 'c-1',
      metadata: { source: 'website', leadQualification: { ...qualifyResult } },
    }

    // First single() = fetch contact; second single() = update result
    mockSingle
      .mockResolvedValueOnce({ data: contact, error: null })
      .mockResolvedValueOnce({ data: updatedContact, error: null })

    vi.mocked(qualifyLead).mockReturnValue(qualifyResult as any)

    const res = await POST(new Request('https://app.test/api/contacts/c-1/score'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contactId).toBe('c-1')
    expect(body.result).toEqual(qualifyResult)
    expect(qualifyLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        phone: '0412345678',
        company: 'Acme',
        jobTitle: 'CEO',
      }),
    )
    expect(mockUpdate).toHaveBeenCalled()
  })
})
