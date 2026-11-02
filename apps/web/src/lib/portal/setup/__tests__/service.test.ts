import { describe, expect, it } from 'vitest'

import type { PortalAccess } from '../../changes/access'
import type { PortalOwner } from '../../changes/types'
import { listConnections, markAccessGranted, saveConnection, type PortalSetupDb } from '../service'

const owner = (tenantSlug: string): PortalOwner => ({ userId: 'u', ownerId: 'u', tenantSlug, plan: 'comp', aal: 'aal2' })
const ok = (tenant: string): PortalAccess => ({ kind: 'ok', owner: owner(tenant) })

type Row = { tenant_slug: string; kind: string; status: string; profile_url: string | null; property_id: string | null; notes: null; updated_at: null }

function fakeDb(rows: Row[], rpc: (fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null } = () => ({ data: null, error: { message: 'unexpected' } }), readError = false) {
  const calls: Array<{ fn: string; args?: Record<string, unknown> }> = []
  const db: PortalSetupDb = {
    rpc(fn, args) {
      calls.push({ fn, args })
      return Promise.resolve(rpc(fn, args))
    },
    from() {
      return {
        select() {
          return {
            eq(_c, tenant) {
              calls.push({ fn: `select:${tenant}` })
              return Promise.resolve(readError ? { data: null, error: { message: 'boom' } } : { data: rows.filter((r) => r.tenant_slug === tenant), error: null })
            },
          }
        },
      }
    },
  }
  return { db, calls }
}

describe('owner connection actions', () => {
  it('anon and aal1 are refused before any database call', async () => {
    for (const access of [{ kind: 'sign_in' }, { kind: 'verify_second_factor' }] as PortalAccess[]) {
      const { db, calls } = fakeDb([])
      expect((await listConnections(access, db)).ok).toBe(false)
      expect((await saveConnection(access, db, { kind: 'x', value: 'https://x.com/brii' })).ok).toBe(false)
      expect((await markAccessGranted(access, db, 'gsc')).ok).toBe(false)
      expect(calls).toEqual([])
    }
  })

  it('lists only her tenant, and a failed read is an error, never an empty checklist', async () => {
    const rows: Row[] = [
      { tenant_slug: 'alpha', kind: 'x', status: 'link_saved', profile_url: 'https://x.com/a', property_id: null, notes: null, updated_at: null },
      { tenant_slug: 'beta', kind: 'x', status: 'verified', profile_url: 'https://x.com/b', property_id: null, notes: null, updated_at: null },
      { tenant_slug: 'alpha', kind: 'myspace', status: 'verified', profile_url: null, property_id: null, notes: null, updated_at: null },
    ]
    const result = await listConnections(ok('alpha'), fakeDb(rows).db)
    expect(result.ok && result.connections).toEqual([{ kind: 'x', status: 'link_saved', value: 'https://x.com/a', notes: null, updatedAt: null }])
    // a misconfigured database that ignores the filter: the code still shows only her rows
    const leaky: PortalSetupDb = { rpc: () => Promise.resolve({ data: null, error: null }), from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }) }) }
    const leaked = await listConnections(ok('alpha'), leaky)
    expect(leaked.ok && leaked.connections.map((c) => c.value)).toEqual(['https://x.com/a'])
    expect(await listConnections(ok('alpha'), fakeDb([], undefined, true).db)).toMatchObject({ ok: false, code: 'failed' })
  })

  it('a bad link never reaches the database', async () => {
    const { db, calls } = fakeDb([])
    expect(await saveConnection(ok('alpha'), db, { kind: 'facebook', value: 'https://evil.example/brii' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await saveConnection(ok('alpha'), db, { kind: 'facebook', value: 'https://www.facebook.com/brii', notes: `code ${'Q'.repeat(40)}` })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await saveConnection(ok('alpha'), db, { kind: 'password', value: 'https://www.facebook.com/brii' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(calls).toEqual([])
  })

  it('saves a social link as a profile URL, and a GSC property as a property id', async () => {
    const { db, calls } = fakeDb([], () => ({ data: 'link_saved', error: null }))
    expect(await saveConnection(ok('alpha'), db, { kind: 'tiktok', value: 'https://www.tiktok.com/@brii' })).toEqual({ ok: true, status: 'link_saved' })
    expect(await saveConnection(ok('alpha'), db, { kind: 'gsc', value: 'sc-domain:brii.com.au' })).toEqual({ ok: true, status: 'link_saved' })
    expect(calls.map((c) => c.args)).toEqual([
      { p_kind: 'tiktok', p_profile_url: 'https://www.tiktok.com/@brii', p_property_id: null, p_notes: null },
      { p_kind: 'gsc', p_profile_url: null, p_property_id: 'sc-domain:brii.com.au', p_notes: null },
    ])
  })

  it('only GSC, Bing and GBP have an access step', async () => {
    const { db, calls } = fakeDb([], () => ({ data: 'access_granted', error: null }))
    expect(await markAccessGranted(ok('alpha'), db, 'facebook')).toMatchObject({ ok: false, code: 'invalid' })
    expect(calls).toEqual([])
    expect(await markAccessGranted(ok('alpha'), db, 'gbp')).toEqual({ ok: true, status: 'access_granted' })
  })

  it('maps database refusals to plain answers and never reports an unknown status as success', async () => {
    const notOwner = fakeDb([], () => ({ data: null, error: { message: 'portal_not_owner' } }))
    expect(await markAccessGranted(ok('alpha'), notOwner.db, 'gsc')).toMatchObject({ ok: false, code: 'verify_second_factor' })
    const noLink = fakeDb([], () => ({ data: null, error: { message: 'portal_bad_input' } }))
    expect(await markAccessGranted(ok('alpha'), noLink.db, 'gsc')).toMatchObject({ ok: false, code: 'invalid' })
    const weird = fakeDb([], () => ({ data: 'hacked', error: null }))
    expect(await markAccessGranted(ok('alpha'), weird.db, 'gsc')).toMatchObject({ ok: false, code: 'failed' })
  })
})
