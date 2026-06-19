import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/coaches/types', () => ({
  COACH_TYPES: ['revenue', 'build', 'marketing', 'life'],
}))

import { getUser } from '@/lib/supabase/server'
import { execute } from '@/lib/ai/router'
import { POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/coaches/ask', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/coaches/ask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ coachType: 'revenue', question: 'Help?' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid coachType', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ coachType: 'invalid', question: 'What is revenue?' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/coachType must be one of/)
  })

  it('returns 400 when question is empty', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ coachType: 'revenue', question: '   ' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('question is required')
  })

  it('returns 400 when question exceeds 2000 characters', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ coachType: 'marketing', question: 'x'.repeat(2001) }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/2,000 character limit/)
  })

  it('returns coach response on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockResolvedValue({
      content: 'Focus on recurring revenue.',
      citations: [],
      thinkingBudget: 5000,
      model: 'claude-opus-4-6',
      usage: { input_tokens: 100, output_tokens: 50 },
    } as any)

    const res = await POST(postReq({ coachType: 'revenue', question: 'How do I grow MRR?' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.brief).toBe('Focus on recurring revenue.')
    expect(body.model).toBe('claude-opus-4-6')
    expect(execute).toHaveBeenCalledWith('coach', expect.objectContaining({
      context: expect.objectContaining({ coachType: 'revenue', userId: 'user-1' }),
    }))
  })

  it('returns 500 when execute throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockRejectedValue(new Error('AI overloaded'))

    const res = await POST(postReq({ coachType: 'life', question: 'Work life balance?' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('AI overloaded')
  })
})
