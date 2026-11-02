import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(), getUser: vi.fn() }))

import { resolvePortalAccess, type PortalOwnerClient } from '../owner'

function clientReturning(result: { data: { card_slug: string }[] | null; error: { message: string } | null }) {
  const eq = vi.fn(async () => result)
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as unknown as PortalOwnerClient, from, select, eq }
}

const user = { id: 'user-1', email: 'sam@example.test', user_metadata: { full_name: 'Sam Lee' } }

describe('resolvePortalAccess (the portal role check)', () => {
  it('treats no user as anonymous without reading anything', async () => {
    const c = clientReturning({ data: [], error: null })
    expect(await resolvePortalAccess(null, c.client)).toEqual({ status: 'anonymous' })
    expect(c.from).not.toHaveBeenCalled()
  })

  it('reads card_owners for the signed-in user only', async () => {
    const c = clientReturning({ data: [{ card_slug: 'sam-plumbing' }], error: null })
    await resolvePortalAccess(user, c.client)
    expect(c.from).toHaveBeenCalledWith('card_owners')
    expect(c.select).toHaveBeenCalledWith('card_slug')
    expect(c.eq).toHaveBeenCalledWith('founder_id', 'user-1')
  })

  it('makes a user who owns a card an owner, with first name and slugs', async () => {
    const c = clientReturning({ data: [{ card_slug: 'sam-plumbing' }, { card_slug: 'NOT VALID' }], error: null })
    expect(await resolvePortalAccess(user, c.client)).toEqual({
      status: 'owner', userId: 'user-1', email: 'sam@example.test', name: 'Sam', cardSlugs: ['sam-plumbing'],
    })
  })

  it('makes a user with no card a non-owner', async () => {
    const c = clientReturning({ data: [], error: null })
    expect(await resolvePortalAccess(user, c.client)).toEqual({ status: 'not_owner', email: 'sam@example.test' })
  })

  it('reports a failed read as an error, never as "no portal"', async () => {
    const failed = clientReturning({ data: null, error: { message: 'permission denied' } })
    expect((await resolvePortalAccess(user, failed.client)).status).toBe('error')
    const thrown = { from: () => { throw new Error('network') } } as unknown as PortalOwnerClient
    expect((await resolvePortalAccess(user, thrown)).status).toBe('error')
    expect((await resolvePortalAccess(user, null)).status).toBe('error')
  })
})
