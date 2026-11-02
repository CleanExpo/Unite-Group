import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(), getUser: vi.fn() }))

import { resolvePortalAccess, type PortalOwnerClient } from '../owner'

type Result<Row> = { data: Row[] | null; error: { message: string } | null }

// One fake client for both owner reads: card_owners (cards) and portal_tenant_members (invite claims).
function clientReturning(
  cards: Result<{ card_slug: string }>,
  tenants: Result<{ tenant_slug: string }> = { data: [], error: null },
) {
  const eq = vi.fn()
  const select = vi.fn()
  const from = vi.fn((table: string) => {
    const result = table === 'card_owners' ? cards : tenants
    return {
      select: (columns: string) => {
        select(table, columns)
        return { eq: async (column: string, value: string) => { eq(table, column, value); return result } }
      },
    }
  })
  return { client: { from } as unknown as PortalOwnerClient, from, select, eq }
}

const user = { id: 'user-1', email: 'sam@example.test', user_metadata: { full_name: 'Sam Lee' } }

describe('resolvePortalAccess (the portal role check)', () => {
  it('treats no user as anonymous without reading anything', async () => {
    const c = clientReturning({ data: [], error: null })
    expect(await resolvePortalAccess(null, c.client)).toEqual({ status: 'anonymous' })
    expect(c.from).not.toHaveBeenCalled()
  })

  it('reads card_owners and portal_tenant_members for the signed-in user only', async () => {
    const c = clientReturning({ data: [{ card_slug: 'sam-plumbing' }], error: null })
    await resolvePortalAccess(user, c.client)
    expect(c.select).toHaveBeenCalledWith('card_owners', 'card_slug')
    expect(c.eq).toHaveBeenCalledWith('card_owners', 'founder_id', 'user-1')
    expect(c.select).toHaveBeenCalledWith('portal_tenant_members', 'tenant_slug')
    expect(c.eq).toHaveBeenCalledWith('portal_tenant_members', 'user_id', 'user-1')
  })

  it('makes a user who owns a card an owner, with first name and slugs', async () => {
    const c = clientReturning({ data: [{ card_slug: 'sam-plumbing' }, { card_slug: 'NOT VALID' }], error: null })
    expect(await resolvePortalAccess(user, c.client)).toEqual({
      status: 'owner', userId: 'user-1', email: 'sam@example.test', name: 'Sam', cardSlugs: ['sam-plumbing'], tenantSlugs: [],
    })
  })

  // portal_redeem_invite writes portal_tenant_members, never card_owners. The join page then links to /portal.
  it('makes a user who claimed a portal by invite an owner, even with no card', async () => {
    const c = clientReturning({ data: [], error: null }, { data: [{ tenant_slug: 'sam-plumbing' }, { tenant_slug: 'NOT VALID' }], error: null })
    expect(await resolvePortalAccess(user, c.client)).toEqual({
      status: 'owner', userId: 'user-1', email: 'sam@example.test', name: 'Sam', cardSlugs: [], tenantSlugs: ['sam-plumbing'],
    })
  })

  it('makes a user with no card and no claimed portal a non-owner', async () => {
    const c = clientReturning({ data: [], error: null })
    expect(await resolvePortalAccess(user, c.client)).toEqual({ status: 'not_owner', email: 'sam@example.test' })
  })

  it('reports a failed read as an error, never as "no portal"', async () => {
    const failed = clientReturning({ data: null, error: { message: 'permission denied' } })
    expect((await resolvePortalAccess(user, failed.client)).status).toBe('error')
    // A card owner whose invite read fails is still an error: half an answer must not decide anything.
    for (const tenants of [{ data: null, error: { message: 'timeout' } }, { data: [], error: { message: 'timeout' } }]) {
      const tenantFailed = clientReturning({ data: [{ card_slug: 'sam-plumbing' }], error: null }, tenants)
      expect((await resolvePortalAccess(user, tenantFailed.client)).status).toBe('error')
    }
    const thrown = { from: () => { throw new Error('network') } } as unknown as PortalOwnerClient
    expect((await resolvePortalAccess(user, thrown)).status).toBe('error')
    expect((await resolvePortalAccess(user, null)).status).toBe('error')
  })
})
