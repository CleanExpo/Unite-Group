import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { execute } from '@/lib/ai/router'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/data/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/data/analyze', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ question: 'test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when question missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/question/)
  })

  it('returns 400 when question too long', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ question: 'x'.repeat(2001) }))
    expect(res.status).toBe(400)
  })

  it('returns analysis result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockResolvedValue({ content: 'Analysis result', citations: [], model: 'claude-3', usage: {} } as any)
    const res = await POST(req({ question: 'What are my expenses?' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Analysis result')
  })

  it('returns 500 when execute throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockRejectedValue(new Error('AI error'))
    const res = await POST(req({ question: 'test question' }))
    expect(res.status).toBe(500)
  })
})
