import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
  }),
}))

import { createServerClient } from '@supabase/ssr'
import { GET } from '../route'

function req(qs: string) {
  return new Request(`https://app.test/api/auth/callback${qs}`)
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReturnValue({ auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) } } as any)
  })

  it('redirects to login with error when provider returns error', async () => {
    const res = await GET(req('?error=access_denied&error_description=User+denied+access'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
    expect(res.headers.get('location')).toContain('error=')
  })

  it('redirects to dashboard after successful code exchange', async () => {
    const res = await GET(req('?code=abc123'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/founder/command-centre')
  })

  it('redirects to login when code exchange fails', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: { message: 'expired' } }) },
    } as any)
    const res = await GET(req('?code=badcode'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects to login when no code or error', async () => {
    const res = await GET(req(''))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('preserves a valid task deep link after login', async () => {
    const next = '/founder/command-centre/studio?taskId=task-123#concept'
    const res = await GET(req(`?code=abc123&next=${encodeURIComponent(next)}`))
    expect(res.headers.get('location')).toBe(`https://app.test${next}`)
  })

  it.each(['https://outside.example/path', '//outside.example/path'])('uses canonical home instead of external return path %s', async next => {
    const res = await GET(req(`?code=abc123&next=${encodeURIComponent(next)}`))
    expect(res.headers.get('location')).toBe('https://app.test/founder/command-centre')
  })
})
