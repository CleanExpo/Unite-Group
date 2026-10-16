import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { isPublicPath, proxy } from '../proxy'
import { POST } from '@/app/api/agents/runner/research/route'
import { POST as claim } from '@/app/api/agents/runner/claim/route'
import { POST as release } from '@/app/api/agents/runner/release/route'

const path = '/api/agents/runner/research'
const request = (pathname = path, method = 'POST', bearer?: string) => new NextRequest(`https://app.test${pathname}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
  ...(method === 'POST' ? { body: '{}' } : {}),
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('AGENT_EVENTS_SECRET', 'test-only-worker-transport-key')
  vi.stubEnv('FOUNDER_USER_ID', 'b0000000-0000-4000-8000-000000000001')
  vi.mocked(checkRateLimit).mockReturnValue(null)
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})
afterEach(() => vi.unstubAllEnvs())

describe('research worker transport uses route authentication', () => {
  it('lets bearer-only POST reach the real handler without cookie refresh or private access checks', async () => {
    const req = request(path, 'POST', 'test-only-worker-transport-key')
    req.headers.set('x-nonce', 'untrusted-client-nonce')
    const transport = await proxy(req)
    expect(transport.status).toBe(200)
    expect(transport.headers.get('x-middleware-next')).toBe('1')
    expect(transport.headers.get('Content-Security-Policy')).toContain('nonce-')
    const nonce = transport.headers.get('x-middleware-request-x-nonce')
    expect(nonce).toBeTruthy()
    expect(nonce).not.toContain('untrusted-client-nonce')
    expect(transport.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce}'`)
    expect(updateSession).not.toHaveBeenCalled()
    expect(hasPrivateAccess).not.toHaveBeenCalled()
    // The real route rejects this deliberately invalid command at its schema,
    // proving the bearer was evaluated instead of a browser login redirect.
    expect((await POST(req)).status).toBe(400)
    expect(isPublicPath(path)).toBe(false)
  })

  it.each([undefined, 'wrong-key'])('keeps missing or invalid bearer rejection in the handler (%s)', async bearer => {
    const req = request(path, 'POST', bearer)
    expect((await proxy(req)).headers.get('x-middleware-next')).toBe('1')
    const response = await POST(req)
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ continue: false })
  })

  it('does not let an unrelated browser cookie block independently authenticated worker transport', async () => {
    vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: { id: 'non-founder' } } as Awaited<ReturnType<typeof updateSession>>)
    expect((await proxy(request())).headers.get('x-middleware-next')).toBe('1')
    expect(hasPrivateAccess).not.toHaveBeenCalled()
  })

  it('applies rate limiting before forwarding and preserves remaining-budget headers', async () => {
    const budget = { success: true, limit: 100, remaining: 12, reset: Math.floor(Date.now() / 1000) + 60 }
    vi.mocked(checkRateLimit).mockReturnValue(budget)
    const response = await proxy(request())
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('12')
    vi.mocked(checkRateLimit).mockReturnValue({ ...budget, success: false, remaining: 0 })
    expect((await proxy(request())).status).toBe(429)
    expect(updateSession).not.toHaveBeenCalled()
  })

  it.each([
    '/api/agents', '/api/agents/events', '/api/agents/runner/continuation',
    `${path}/`, `${path}/private`, `${path}.png`, `${path}er`,
    '/api/agents/runner/Research', '/api/agents/runner/%72esearch',
    '/api/agents/runner/claimed?next=/api/agents/runner/research',
  ])('retains cookie authentication for sibling, suffix and query lookalikes: %s', async pathname => {
    const response = await proxy(request(pathname))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(updateSession).toHaveBeenCalledOnce()
  })

  it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])('retains cookie authentication for %s on the worker path', async method => {
    expect((await proxy(request(path, method))).status).toBe(307)
    expect(updateSession).toHaveBeenCalledOnce()
  })

  it('ignores a normal query on the exact route while the real handler still requires its bearer', async () => {
    const req = request(`${path}?ignored=/api/agents/runner/claim`)
    expect((await proxy(req)).headers.get('x-middleware-next')).toBe('1')
    expect((await POST(req)).status).toBe(401)
  })
})

describe.each([
  ['/api/agents/runner/claim', claim], ['/api/agents/runner/release', release],
] as const)('runner bearer transport for %s', (runnerPath, handler) => {
  it.each([undefined, 'wrong-key', 'test-only-worker-transport-key'])('forwards exact POST with CSP and delegates bearer validation: %s', async bearer => {
    const req = request(runnerPath, 'POST', bearer)
    const transport = await proxy(req)
    expect(transport.headers.get('x-middleware-next')).toBe('1')
    expect(transport.headers.get('Content-Security-Policy')).toContain('nonce-')
    expect(updateSession).not.toHaveBeenCalled()
    expect(hasPrivateAccess).not.toHaveBeenCalled()
    expect((await handler(req)).status).toBe(bearer === 'test-only-worker-transport-key' ? 400 : 401)
    expect(isPublicPath(runnerPath)).toBe(false)
  })

  it('preserves the handler missing-founder refusal', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '')
    const req = request(runnerPath, 'POST', 'test-only-worker-transport-key')
    expect((await proxy(req)).headers.get('x-middleware-next')).toBe('1')
    expect((await handler(req)).status).toBe(503)
  })

  it.each(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'])('keeps cookie authentication for %s', async method => {
    expect((await proxy(request(runnerPath, method))).status).toBe(307)
    expect(updateSession).toHaveBeenCalledOnce()
  })

  it.each(['/', '/private', '.png', 'ed', '%2fprivate'])('keeps suffixes/descendants private: %s', async suffix => {
    expect((await proxy(request(`${runnerPath}${suffix}`))).status).toBe(307)
    expect(updateSession).toHaveBeenCalledOnce()
  })

  it('does not decode an encoded spelling into transport authority', async () => {
    const encoded = runnerPath.replace('/runner/', '/%72unner/')
    expect((await proxy(request(encoded))).status).toBe(307)
    expect(updateSession).toHaveBeenCalledOnce()
  })

  it('applies rate-limit denial before transport admission', async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ success: false, limit: 100, remaining: 0, reset: Math.floor(Date.now() / 1000) + 60 })
    expect((await proxy(request(runnerPath))).status).toBe(429)
    expect(updateSession).not.toHaveBeenCalled()
  })
})
