import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/ideas/conversation', () => ({
  parseClaudeResponse: vi.fn().mockReturnValue({ type: 'question', question: 'What is the target audience?' }),
}))

import { getUser } from '@/lib/supabase/server'
import { execute } from '@/lib/ai/router'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/ideas/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ideas/capture', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ rawIdea: 'Build a feature', messages: [] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when rawIdea missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ messages: [] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rawIdea/)
  })

  it('returns 400 when messages is not array', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ rawIdea: 'Build a feature', messages: 'not-array' }))
    expect(res.status).toBe(400)
  })

  it('returns parsed response on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockResolvedValue({ content: 'AI response' } as any)
    const res = await POST(req({ rawIdea: 'Build a notifications system', messages: [] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('question')
  })
})
