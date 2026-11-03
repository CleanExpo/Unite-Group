import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { decidePortalAccess } from '../changes/access'
import { readPortalOwner, type OwnerReadClient } from '../owner'

// The owner is her own portal_tenant_members row (written by the invite redeem), never a token claim. This fake
// applies the same row rules as the database: a user reads only her own membership rows (any aal), and her tenant's
// entitlement row only on an aal2 session. The rules themselves are proven on Postgres by
// scripts/portal-owner-db-proof.sh; this checks what the app does with what they return.

type Member = { tenant_slug: unknown; user_id: string; created_at: string }
type Opts = {
  user?: { id: string; app_metadata?: Record<string, unknown> } | null
  aal?: string | null
  members?: Member[]
  membersError?: string
  plans?: Record<string, unknown>
  entitlementsError?: string
}

function fake(o: Opts) {
  const reads: string[] = []
  const client = {
    auth: {
      getUser: async () => ({ data: { user: o.user ?? null } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: o.aal ?? null } }) },
    },
    from(table: string) {
      reads.push(table)
      const eqs: [string, unknown][] = []
      const orders: [string, boolean][] = []
      const visible = (): Record<string, unknown>[] => {
        if (table === 'portal_tenant_members') return (o.members ?? []).filter((m) => m.user_id === o.user?.id)
        const mine = new Set((o.members ?? []).filter((m) => m.user_id === o.user?.id).map((m) => m.tenant_slug))
        if (o.aal !== 'aal2') return []
        return Object.entries(o.plans ?? {}).filter(([t]) => mine.has(t))
          .map(([tenant_slug, plan]) => ({ tenant_slug, plan, modules: {} }))
      }
      const rows = () => {
        let r = visible().filter((row) => eqs.every(([c, v]) => row[c] === v))
        r = [...r].sort((a, b) => {
          for (const [c, asc] of orders) {
            const x = String(a[c]), y = String(b[c])
            if (x !== y) return (x < y ? -1 : 1) * (asc ? 1 : -1)
          }
          return 0
        })
        return r
      }
      const builder = {
        select: () => builder,
        eq: (c: string, v: unknown) => (eqs.push([c, v]), builder),
        order: (c: string, opts: { ascending: boolean }) => (orders.push([c, opts.ascending]), builder),
        limit: async (n: number) => (o.membersError
          ? { data: null, error: { message: o.membersError } }
          : { data: rows().slice(0, n).map((m) => ({ tenant_slug: m.tenant_slug })), error: null }),
        maybeSingle: async () => (o.entitlementsError
          ? { data: null, error: { message: o.entitlementsError } }
          : { data: rows()[0] ?? null, error: null }),
      }
      return builder
    },
  }
  return { client: client as unknown as OwnerReadClient, reads }
}

const IVI = { id: 'u-ivi' }
const BRII: Member = { tenant_slug: 'brii', user_id: 'u-ivi', created_at: '2026-11-03T01:00:00Z' }

describe('the portal owner is her own invite membership', () => {
  it('signed out is not an owner, and nothing is read', async () => {
    const { client, reads } = fake({ user: null })
    expect(await readPortalOwner(client)).toBeNull()
    expect(reads).toEqual([])
  })

  it('a signed-in user with no membership (for example the founder) is not an owner', async () => {
    expect(await readPortalOwner(fake({ user: { id: 'founder' }, aal: 'aal2', members: [BRII] }).client)).toBeNull()
  })

  it('a tenant claim in app_metadata alone opens nothing: only the membership counts', async () => {
    const user = { id: 'u-mallory', app_metadata: { portal_tenant_slug: 'brii', portal_plan: 'paid' } }
    expect(await readPortalOwner(fake({ user, aal: 'aal2', members: [BRII], plans: { brii: 'paid' } }).client)).toBeNull()
  })

  it('an invited owner on a second-factor (aal2) session gets her tenant and the plan from her entitlements', async () => {
    const owner = await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [BRII], plans: { brii: 'comp' } }).client)
    expect(owner).toEqual({ userId: 'u-ivi', ownerId: 'u-ivi', tenantSlug: 'brii', plan: 'comp', aal: 'aal2' })
    expect(decidePortalAccess(owner).kind).toBe('ok')
  })

  it('a paid tenant reads as paid, and a tenant with no entitlement row as no plan', async () => {
    expect((await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [BRII], plans: { brii: 'paid' } }).client))?.plan).toBe('paid')
    expect((await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [BRII] }).client))?.plan).toBe('none')
  })

  it('on the emailed link only (aal1) she is an owner who must confirm it is her; her plan is not read', async () => {
    const { client, reads } = fake({ user: IVI, aal: 'aal1', members: [BRII], plans: { brii: 'comp' } })
    const owner = await readPortalOwner(client)
    expect(owner).toEqual({ userId: 'u-ivi', ownerId: 'u-ivi', tenantSlug: 'brii', plan: 'none', aal: 'aal1' })
    expect(decidePortalAccess(owner).kind).toBe('verify_second_factor')
    expect(reads).toEqual(['portal_tenant_members'])
  })

  it('an unknown or missing assurance level counts as aal1', async () => {
    for (const aal of [null, 'AAL2', 'aal3']) {
      expect((await readPortalOwner(fake({ user: IVI, aal, members: [BRII] }).client))?.aal, String(aal)).toBe('aal1')
    }
  })

  it('the oldest membership wins, then the tenant name, the same pick as the database helper', async () => {
    const older: Member = { tenant_slug: 'zeta-co', user_id: 'u-ivi', created_at: '2026-11-01T00:00:00Z' }
    const newer: Member = { tenant_slug: 'alpha-co', user_id: 'u-ivi', created_at: '2026-11-02T00:00:00Z' }
    expect((await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [newer, older] }).client))?.tenantSlug).toBe('zeta-co')
    const tie: Member = { ...older, tenant_slug: 'beta-co' }
    expect((await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [older, tie] }).client))?.tenantSlug).toBe('beta-co')
  })

  it('a malformed tenant in the row is refused, so it cannot reach a query', async () => {
    for (const slug of ['Brii', 'brii/other', '', 'a'.repeat(65), "brii' or 1=1", 42, null]) {
      const member = { ...BRII, tenant_slug: slug }
      expect(await readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [member] }).client), String(slug)).toBeNull()
    }
  })

  it('a failed membership read is an error, never "no portal"', async () => {
    await expect(readPortalOwner(fake({ user: IVI, aal: 'aal2', membersError: 'timeout' }).client))
      .rejects.toThrow('portal membership read failed: timeout')
  })

  it('a failed plan read is an error, never "no plan"', async () => {
    await expect(readPortalOwner(fake({ user: IVI, aal: 'aal2', members: [BRII], entitlementsError: 'timeout' }).client))
      .rejects.toThrow('portal entitlements read failed: timeout')
  })
})
