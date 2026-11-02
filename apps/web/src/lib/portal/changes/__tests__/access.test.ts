import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { decidePortalAccess, deniedResult, signInPath } from '../access'
import { ownerFromSession } from '../owner-stub'

const ALPHA = { id: 'u-a1', app_metadata: { portal_tenant_slug: 'alpha', portal_plan: 'comp' } }

describe('who may use the owner portal', () => {
  it('anon (no session) is sent to sign in', () => {
    expect(ownerFromSession(null, null)).toBeNull()
    expect(decidePortalAccess(null)).toEqual({ kind: 'sign_in' })
  })

  it('aal1 is never access: the owner is asked for her second factor', () => {
    const owner = ownerFromSession(ALPHA, 'aal1')
    expect(owner?.aal).toBe('aal1')
    expect(decidePortalAccess(owner)).toEqual({ kind: 'verify_second_factor' })
  })

  it('an unknown or missing assurance level counts as aal1', () => {
    expect(decidePortalAccess(ownerFromSession(ALPHA, undefined)).kind).toBe('verify_second_factor')
    expect(decidePortalAccess(ownerFromSession(ALPHA, 'AAL2')).kind).toBe('verify_second_factor')
  })

  it('a signed-in user with no portal tenant (for example the founder) is not an owner', () => {
    expect(ownerFromSession({ id: 'founder', app_metadata: {} }, 'aal2')).toBeNull()
    expect(ownerFromSession({ id: 'founder', app_metadata: null }, 'aal2')).toBeNull()
  })

  it('a malformed tenant claim is refused, so a crafted value cannot reach a query', () => {
    for (const slug of ['Alpha', 'alpha/beta', '', 'a'.repeat(65), "alpha' or 1=1", 42]) {
      expect(ownerFromSession({ id: 'x', app_metadata: { portal_tenant_slug: slug } }, 'aal2'), String(slug)).toBeNull()
    }
  })

  it('the tenant comes only from app_metadata, never user_metadata', () => {
    const forged = { id: 'u-b2', app_metadata: { portal_tenant_slug: 'beta' }, user_metadata: { portal_tenant_slug: 'alpha' } }
    expect(ownerFromSession(forged, 'aal2')?.tenantSlug).toBe('beta')
  })

  it('a correct aal2 owner gets in, with her own tenant and plan', () => {
    const access = decidePortalAccess(ownerFromSession(ALPHA, 'aal2'))
    expect(access).toEqual({ kind: 'ok', owner: { userId: 'u-a1', ownerId: 'u-a1', tenantSlug: 'alpha', plan: 'comp', aal: 'aal2' } })
  })

  it('an unknown plan falls back to none', () => {
    expect(ownerFromSession({ id: 'x', app_metadata: { portal_tenant_slug: 'alpha', portal_plan: 'gold' } }, 'aal2')?.plan).toBe('none')
  })

  it('refusals carry a code the form can act on', () => {
    expect(deniedResult({ kind: 'sign_in' })).toMatchObject({ ok: false, code: 'sign_in' })
    expect(deniedResult({ kind: 'verify_second_factor' })).toMatchObject({ ok: false, code: 'verify_second_factor' })
  })

  it('the sign-in link encodes where to come back to', () => {
    expect(signInPath('/portal/changes?x=1')).toBe('/auth/login?redirectTo=%2Fportal%2Fchanges%3Fx%3D1')
  })
})
