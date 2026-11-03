import { describe, expect, it } from 'vitest'

import { decidePortalAccess, deniedResult, signInPath } from '../access'
import type { PortalOwner } from '../types'

// Who counts as an owner (membership, aal, plan) is tested in lib/portal/__tests__/owner.test.ts.
const ALPHA: PortalOwner = { userId: 'u-a1', ownerId: 'u-a1', tenantSlug: 'alpha', plan: 'comp', aal: 'aal2' }

describe('who may use the owner portal', () => {
  it('anon, or a signed-in user with no portal, is sent to sign in', () => {
    expect(decidePortalAccess(null)).toEqual({ kind: 'sign_in' })
  })

  it('aal1 is never access: the owner is asked for her second factor', () => {
    expect(decidePortalAccess({ ...ALPHA, aal: 'aal1' })).toEqual({ kind: 'verify_second_factor' })
  })

  it('a correct aal2 owner gets in, with her own tenant and plan', () => {
    expect(decidePortalAccess(ALPHA)).toEqual({ kind: 'ok', owner: ALPHA })
  })

  it('refusals carry a code the form can act on', () => {
    expect(deniedResult({ kind: 'sign_in' })).toMatchObject({ ok: false, code: 'sign_in' })
    expect(deniedResult({ kind: 'verify_second_factor' })).toMatchObject({ ok: false, code: 'verify_second_factor' })
  })

  it('the sign-in link encodes where to come back to', () => {
    expect(signInPath('/portal/changes?x=1')).toBe('/auth/login?redirectTo=%2Fportal%2Fchanges%3Fx%3D1')
  })
})
