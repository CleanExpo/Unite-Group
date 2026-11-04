import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/portal/owner', () => ({ getPortalOwner: vi.fn() }))

import { headers } from 'next/headers'
import { getUser } from '@/lib/supabase/server'
import { getPortalOwner } from '@/lib/portal/owner'
import type { PortalOwner } from '@/lib/portal/changes/types'

import { GET } from '../route'

// A line that appears only inside the IAQ concept page. If it is in a response body, the page leaked.
const PAGE_MARKER = 'A concept prepared by Phill McGurk for the IAQ Magazine board'
const NONCE = 'dGVzdC1ub25jZS0xMjM0NQ=='

const IAQ: PortalOwner = { userId: 'b1', ownerId: 'b1', tenantSlug: 'iaq-magazine', plan: 'comp', aal: 'aal2' }
const OTHER: PortalOwner = { userId: 'o1', ownerId: 'o1', tenantSlug: 'brii', plan: 'comp', aal: 'aal2' }

type User = Awaited<ReturnType<typeof getUser>>
function given(user: { id: string; email?: string } | null, owner: PortalOwner | null | Error) {
  vi.mocked(getUser).mockResolvedValue(user as User)
  if (owner instanceof Error) vi.mocked(getPortalOwner).mockRejectedValue(owner)
  else vi.mocked(getPortalOwner).mockResolvedValue(owner)
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-nonce': NONCE }) as unknown as Awaited<ReturnType<typeof headers>>)
}
const request = () => new Request('https://unite.example/portal/board')

beforeEach(() => vi.clearAllMocks())

describe('/portal/board serves the IAQ board concept only to IAQ Magazine members', () => {
  it('(a) signed out: sends the visitor to sign in, back to /portal/board, and returns no page content', async () => {
    given(null, null)
    const res = await GET(request())
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname + new URL(res.headers.get('location')!).search)
      .toBe('/auth/login?redirectTo=%2Fportal%2Fboard')
    expect(await res.text()).not.toContain(PAGE_MARKER)
    expect(getPortalOwner).not.toHaveBeenCalled()
  })

  it('(b) another client (aal2 owner of brii): 404, no page content', async () => {
    given({ id: 'o1', email: 'owner@brii.test' }, OTHER)
    const res = await GET(request())
    expect(res.status).toBe(404)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(await res.text()).not.toContain(PAGE_MARKER)
  })

  it('(b) signed in with no portal at all: 404, no page content', async () => {
    given({ id: 'v1', email: 'visitor@example.test' }, null)
    const res = await GET(request())
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain(PAGE_MARKER)
  })

  it('an IAQ member on the emailed link only (aal1) is sent to confirm the second step, with no page content', async () => {
    given({ id: 'b1', email: 'board@iaq.test' }, { ...IAQ, aal: 'aal1', plan: 'none' })
    const res = await GET(request())
    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname + loc.search).toBe('/portal/verify?redirectTo=%2Fportal%2Fboard')
    expect(await res.text()).not.toContain(PAGE_MARKER)
  })

  it('a failed membership read never serves the page and never looks like "no portal"', async () => {
    given({ id: 'b1', email: 'board@iaq.test' }, new Error('portal membership read failed: timeout'))
    const res = await GET(request())
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain(PAGE_MARKER)
  })

  it('(c) an IAQ member on aal2 sees the page, kept out of search engines and private caches', async () => {
    given({ id: 'b1', email: 'board@iaq.test' }, IAQ)
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    const body = await res.text()
    expect(body).toContain(PAGE_MARKER)
    expect(body).toContain('<meta name="robots" content="noindex">')
    // The animation script runs under the site's nonce CSP; the JSON-LD data block needs no nonce.
    expect(body).toContain(`<script nonce="${NONCE}">`)
    expect(body).toContain('<script type="application/ld+json">')
    expect(body).not.toMatch(/<script>/)
  })
})
