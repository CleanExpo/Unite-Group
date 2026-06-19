import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/ai/features/web-fetch', () => ({
  fetchUrlContent: vi.fn(),
  formatPageForPrompt: vi.fn().mockReturnValue(''),
}))

import { getUser } from '@/lib/supabase/server'
import { execute } from '@/lib/ai/router'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/research', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ query: 'test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when query missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/query/)
  })

  it('returns 400 when query too long', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ query: 'x'.repeat(2001) }))
    expect(res.status).toBe(400)
  })

  it('returns research result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(execute).mockResolvedValue({ content: 'Research result', citations: [], model: 'claude-3', usage: {} } as any)
    const res = await POST(req({ query: 'What is the GST rate in Australia?' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('Research result')
  })
})
