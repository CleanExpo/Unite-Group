import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { execute } from '@/lib/ai/router'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/strategy/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/strategy/analyze', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ prompt: 'test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when prompt missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when prompt exceeds 4000 chars', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ prompt: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
  })

  it('returns analysis on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockResolvedValue({ content: 'Strategic analysis', citations: [], model: 'claude-3', usage: {} } as any)
    const res = await POST(req({ prompt: 'Analyse growth strategy for Q3' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.output).toBe('Strategic analysis')
  })

  it('returns 500 when execute throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockRejectedValue(new Error('AI unavailable'))
    const res = await POST(req({ prompt: 'test prompt' }))
    expect(res.status).toBe(500)
  })
})
