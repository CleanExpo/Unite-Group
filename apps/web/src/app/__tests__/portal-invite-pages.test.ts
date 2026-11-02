import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// UNI-3167 pages and actions: the founder invite page and /portal/join.
// Supabase, the founder allow-list and Next's request helpers are replaced with fakes; the logic under test is real.

const getUser = vi.fn()
const createClient = vi.fn()
const createServiceClient = vi.fn()
const hasPrivateAccess = vi.fn()
const updateSession = vi.fn()
const headerValues = new Map<string, string>()

vi.mock('@/lib/supabase/server', () => ({ getUser: () => getUser(), createClient: () => createClient() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient(), hasSupabaseServiceConfig: () => true }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: (u: unknown) => hasPrivateAccess(u), isPrivateAccessConfigured: () => true }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: (...a: unknown[]) => updateSession(...a) }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: () => null }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => ({ get: (k: string) => headerValues.get(k) ?? null }) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') }, redirect: (u: string) => { throw new Error(`NEXT_REDIRECT ${u}`) } }))

import { createInviteAction, revokeInviteAction } from '../(founder)/founder/portal-invites/actions'
import PortalInvitesPage from '../(founder)/founder/portal-invites/page'
import { redeemInviteAction, requestJoinLinkAction } from '../(portal)/portal/join/actions'
import { proxy } from '../../proxy'
import { BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL } from '@/lib/portal/invites/__fixtures__/brii'

const OWNER = { id: '00000000-0000-4000-8000-0000000000a1', email: BRII_OWNER_EMAIL }
const FOUNDER = { id: '00000000-0000-4000-8000-0000000000f0', email: 'founder@unite.test' }

beforeEach(() => {
  vi.clearAllMocks()
  headerValues.clear()
  headerValues.set('x-forwarded-for', '203.0.113.9')
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
})

describe('founder invite page and actions: owners cannot use them', () => {
  it('a signed-in portal owner (not on the founder list) cannot make or cancel a code; no database client is made', async () => {
    getUser.mockResolvedValue(OWNER)
    hasPrivateAccess.mockReturnValue(false)
    expect(await createInviteAction({ tenantSlug: 'brii' })).toEqual({ ok: false, error: 'Only the founder can make invite codes.' })
    expect(await revokeInviteAction('11111111-1111-4111-8111-111111111111')).toEqual({ ok: false, error: 'Only the founder can cancel invite codes.' })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('a signed-out caller cannot make a code', async () => {
    getUser.mockResolvedValue(null)
    expect(await createInviteAction({ tenantSlug: 'brii' })).toMatchObject({ ok: false })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('the founder page itself is not found for an owner', async () => {
    getUser.mockResolvedValue(OWNER)
    hasPrivateAccess.mockReturnValue(false)
    await expect(PortalInvitesPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('the proxy turns a signed-in owner away from /founder/portal-invites before the page runs', async () => {
    updateSession.mockResolvedValue({ response: NextResponse.next(), user: OWNER })
    hasPrivateAccess.mockReturnValue(false)
    const res = await proxy(new NextRequest('https://app.test/founder/portal-invites'))
    const location = new URL(res.headers.get('location') ?? 'https://x/none')
    expect(location.pathname).toBe('/auth/login')
    expect(location.searchParams.get('access')).toBe('denied')
  })

  it('the founder can make a code: it is saved as a hash by the service client', async () => {
    getUser.mockResolvedValue(FOUNDER)
    hasPrivateAccess.mockReturnValue(true)
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: {
      id: '11111111-1111-4111-8111-111111111111', code_hint: 'ABCD', tenant_slug: 'brii', bound_email: null,
      expires_at: '2026-11-16T08:00:00.000Z', revoked_at: null, created_at: '2026-11-02T08:00:00.000Z', portal_invite_redemptions: [],
    }, error: null }) }) }))
    createServiceClient.mockReturnValue({ from: () => ({ insert }) })
    const r = await createInviteAction({ tenantSlug: 'brii' })
    expect(r.ok).toBe(true)
    const row = (insert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(row.created_by).toBe(FOUNDER.id)
    if (r.ok) expect(JSON.stringify(row)).not.toContain(r.code.replace(/-/g, ''))
  })
})

describe('/portal/join proxy rule', () => {
  it('a signed-out visitor and a signed-in owner both reach /portal/join (the page checks the rest)', async () => {
    for (const user of [null, OWNER]) {
      updateSession.mockResolvedValue({ response: NextResponse.next(), user })
      hasPrivateAccess.mockReturnValue(false)
      const res = await proxy(new NextRequest(`https://app.test/portal/join?code=${BRII_EXAMPLE_CODE}`))
      expect(res.headers.get('location')).toBeNull()
      expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    }
  })

  // The public rule is exact: a signed-out visitor anywhere else under /portal is sent to sign in. (Signed-in visitors
  // on /portal pages pass the founder allow-list by design since the portal foundation, UNI-3174, and each page checks
  // its own owner; src/__tests__/portal-proxy.test.ts holds that rule.)
  it.each(['/portal', '/portal/join/x', '/portal/joinx', '/portal/admin'])('does not open %s', async (path) => {
    updateSession.mockResolvedValue({ response: NextResponse.next(), user: null })
    hasPrivateAccess.mockReturnValue(false)
    const res = await proxy(new NextRequest(`https://app.test${path}`))
    expect(new URL(res.headers.get('location') ?? 'https://x/none').pathname).toBe('/auth/login')
  })
})

describe('/portal/join actions', () => {
  function linkService(allowed: boolean, row: Record<string, unknown> | null) {
    const svc = {
      rpc: vi.fn(async () => ({ data: allowed, error: null })),
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) })),
    }
    createServiceClient.mockReturnValue(svc)
    return svc
  }
  const usable = { expires_at: '2099-01-01T00:00:00.000Z', revoked_at: null, bound_email: BRII_OWNER_EMAIL, portal_invite_redemptions: [] }

  it('sends a sign-in link that may create the account only for a usable code, and it returns to /portal/join', async () => {
    const svc = linkService(true, usable)
    const signInWithOtp = vi.fn(async () => ({ error: null }))
    createClient.mockResolvedValue({ auth: { signInWithOtp } })
    expect(await requestJoinLinkAction(BRII_EXAMPLE_CODE.toLowerCase(), 'Owner@Brii.test')).toEqual({ ok: true })
    const rpcArgs = (svc.rpc.mock.calls[0] as unknown[])[1] as { p_client_key: string }
    expect(rpcArgs.p_client_key).toMatch(/^[0-9a-f]{64}$/)
    expect(rpcArgs.p_client_key).not.toContain('203.0.113.9')
    const otp = (signInWithOtp.mock.calls[0] as unknown[])[0] as { email: string; options: { emailRedirectTo: string; shouldCreateUser: boolean } }
    expect(otp.email).toBe(BRII_OWNER_EMAIL)
    expect(otp.options.shouldCreateUser).toBe(true)
    const redirect = new URL(otp.options.emailRedirectTo)
    expect(redirect.origin + redirect.pathname).toBe('https://app.test/api/auth/callback')
    expect(redirect.searchParams.get('next')).toBe(`/portal/join?code=${BRII_EXAMPLE_CODE}`)
  })

  it.each([
    ['expired', { ...usable, expires_at: '2000-01-01T00:00:00.000Z' }, true, 'expired'],
    ['cancelled', { ...usable, revoked_at: '2026-11-01T00:00:00.000Z' }, true, 'revoked'],
    ['used', { ...usable, portal_invite_redemptions: [{ redeemed_at: '2026-11-01T00:00:00.000Z' }] }, true, 'used'],
    ['for another email', { ...usable, bound_email: 'someone@else.test' }, true, 'wrong_email'],
    ['unknown', null, true, 'not_found'],
    ['asked for too often', usable, false, 'rate_limited'],
  ])('sends no link when the code is %s', async (_label, row, allowed, outcome) => {
    linkService(allowed as boolean, row as Record<string, unknown> | null)
    const signInWithOtp = vi.fn()
    createClient.mockResolvedValue({ auth: { signInWithOtp } })
    expect(await requestJoinLinkAction(BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL)).toEqual({ ok: false, outcome })
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('a bad email is refused before anything else runs', async () => {
    expect(await requestJoinLinkAction(BRII_EXAMPLE_CODE, 'nope')).toEqual({ ok: false, outcome: 'bad_email' })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('a signed-out caller cannot redeem', async () => {
    getUser.mockResolvedValue(null)
    expect(await redeemInviteAction(BRII_EXAMPLE_CODE)).toBe('signed_out')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('an aal1 owner is sent to verify, and the database decides', async () => {
    getUser.mockResolvedValue(OWNER)
    const rpc = vi.fn(async () => ({ data: 'needs_second_factor', error: null }))
    createClient.mockResolvedValue({ rpc })
    expect(await redeemInviteAction(BRII_EXAMPLE_CODE)).toBe('needs_second_factor')
    expect(rpc).toHaveBeenCalledWith('portal_redeem_invite', { p_code_hash: expect.stringMatching(/^[0-9a-f]{64}$/) })
  })

  it('an aal2 owner redeems on their own session (not the service role)', async () => {
    getUser.mockResolvedValue(OWNER)
    createClient.mockResolvedValue({ rpc: vi.fn(async () => ({ data: 'redeemed', error: null })) })
    expect(await redeemInviteAction(BRII_EXAMPLE_CODE)).toBe('redeemed')
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})

describe('no password anywhere in the new pages', () => {
  const appDir = join(__dirname, '..')
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : /\.(tsx?|css)$/.test(f) ? [p] : []
  })
  const files = [...walk(join(appDir, '(portal)', 'portal', 'join')), ...walk(join(appDir, '(founder)', 'founder', 'portal-invites'))]

  it('scans the real page files (positive control)', () => {
    expect(files.map((f) => f.split(/[\\/]/).pop())).toEqual(expect.arrayContaining(['page.tsx', 'join-steps.tsx', 'second-factor.tsx', 'invite-panel.tsx']))
    expect(files.length).toBeGreaterThanOrEqual(12)
  })

  // A password field or flow, not the friendly sentence "there is no password to remember".
  const PASSWORD_SIGNS = [
    /type\s*=\s*\{?\s*["']password["']/i, // a password input
    /autoComplete\s*=\s*["'](current|new)-password["']/i, // a browser password hint
    /signInWithPassword|signUp\s*\(/, // a password sign-in or sign-up call
    /\bpassword\s*:/i, // a password value handed to auth (updateUser({ password: ... }))
  ]
  const passwordSigns = (text: string) => PASSWORD_SIGNS.filter((re) => re.test(text)).map(String)

  it('the scan catches a real password field (control: the existing founder login page has one)', () => {
    const login = readFileSync(join(appDir, '(auth)', 'auth', 'login', 'page.tsx'), 'utf8')
    expect(passwordSigns(login).length).toBeGreaterThan(0)
  })

  it('no new page or action has a password field or password flow', () => {
    for (const f of files) expect(passwordSigns(readFileSync(f, 'utf8')), f).toEqual([])
  })
})
