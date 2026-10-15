import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { proxy, isPublicPath } from '../proxy'
import { POST } from '@/app/api/integrations/idea-evidence/route'

const path = '/api/integrations/idea-evidence'
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('IDEA_EVIDENCE_ENABLED', '1')
  vi.mocked(checkRateLimit).mockReturnValue(null)
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})
afterEach(() => vi.unstubAllEnvs())

it.each([
  [path, 'POST', 200],
  [`${path}?trace=normal`, 'POST', 200],
  ['/api/integrations', 'POST', 307],
  [`${path}/`, 'POST', 307],
  [`${path}/private`, 'POST', 307],
  [`${path}.png`, 'POST', 307],
  ['/api/integrations/Idea-evidence', 'POST', 307],
  ['/api/integrations/%69dea-evidence', 'POST', 307],
  [path, 'GET', 307],
  [path, 'PUT', 307],
  [path, 'DELETE', 307],
  [path, 'OPTIONS', 307],
] as const)('keeps independently signed transport bounded to %s %s (%s)', async (pathname, method, expectedStatus) => {
  const request = new NextRequest(`https://app.test${pathname}`, {
    method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}),
  })
  const response = await proxy(request)
  expect(response.status).toBe(expectedStatus)
  if (expectedStatus === 200) {
    expect(updateSession).not.toHaveBeenCalled()
    expect(isPublicPath(path)).toBe(false)
    // The actual handler rejects missing signed input; transport grants no evidence authority.
    expect((await POST(request)).status).toBe(400)
  } else {
    expect(updateSession).toHaveBeenCalledOnce()
    expect(response.headers.get('location')).toContain('/auth/login')
  }
})

it('retains rate limiting before signed evidence authentication', async () => {
  vi.mocked(checkRateLimit).mockReturnValue({ success: false, limit: 10, remaining: 0, reset: Math.floor(Date.now() / 1000) + 60 })
  const response = await proxy(new NextRequest(`https://app.test${path}`, { method: 'POST', body: '{}' }))
  expect(response.status).toBe(429)
  expect(updateSession).not.toHaveBeenCalled()
})
