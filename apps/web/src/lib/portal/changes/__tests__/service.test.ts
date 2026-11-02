import { describe, expect, it } from 'vitest'

import type { PortalAccess } from '../access'
import { approveChangeRequest, askForChangeEdits, listChangeRequests, submitChangeRequest, type PortalChangesDb } from '../service'
import type { PortalOwner } from '../types'

const R1 = '11111111-1111-1111-1111-111111111111'
const owner = (tenantSlug: string, aal: 'aal1' | 'aal2' = 'aal2'): PortalOwner =>
  ({ userId: `u-${tenantSlug}`, ownerId: `u-${tenantSlug}`, tenantSlug, plan: 'comp', aal })
const ok = (o: PortalOwner): PortalAccess => ({ kind: 'ok', owner: o })

type Row = { id: string; tenant_slug: string; page: string; request_text: string; photo_path: null; status: string
  preview_url: string | null; edit_note: null; created_at: string; updated_at: string; approved_at: null }
const row = (over: Partial<Row>): Row => ({
  id: R1, tenant_slug: 'alpha', page: 'home', request_text: 'Swap the photo', photo_path: null, status: 'preview_ready',
  preview_url: 'https://preview.invalid/alpha/r1', edit_note: null, created_at: '2026-11-02T08:00:00Z',
  updated_at: '2026-11-02T08:00:00Z', approved_at: null, ...over,
})

/** A fake that behaves like the real client would for a session of `sessionTenant`, and records every call. */
function fakeDb(rows: Row[], opts: { rpc?: (fn: string) => { data: unknown; error: { message: string } | null }; readError?: boolean; leaky?: boolean } = {}) {
  const calls: string[] = []
  const db: PortalChangesDb = {
    rpc(fn) {
      calls.push(`rpc:${fn}`)
      return Promise.resolve(opts.rpc ? opts.rpc(fn) : { data: null, error: { message: 'unexpected' } })
    },
    from() {
      return {
        select() {
          return {
            eq(_c, tenant) {
              calls.push(`select:${tenant}`)
              // leaky: a misconfigured database that ignores the filter and has no row rules
              const mine = opts.leaky ? rows : rows.filter((r) => r.tenant_slug === tenant)
              return {
                order: () => Promise.resolve(opts.readError ? { data: null, error: { message: 'boom' } } : { data: mine, error: null }),
                eq: (_c2: 'id', id: string) => ({
                  maybeSingle: () => Promise.resolve({ data: mine.find((r) => r.id === id) ?? null, error: null }),
                }),
              }
            },
          }
        },
      }
    },
  }
  return { db, calls }
}

describe('owner change-request actions', () => {
  it('anon and aal1 are refused before any database call', async () => {
    for (const access of [{ kind: 'sign_in' }, { kind: 'verify_second_factor' }] as PortalAccess[]) {
      const { db, calls } = fakeDb([row({})])
      expect((await listChangeRequests(access, db)).ok).toBe(false)
      expect((await submitChangeRequest(access, db, { page: 'home', requestText: 'Change it please' })).ok).toBe(false)
      expect((await approveChangeRequest(access, db, R1)).ok).toBe(false)
      expect((await askForChangeEdits(access, db, R1, 'make it red')).ok).toBe(false)
      expect(calls).toEqual([])
    }
  })

  it('lists only her own tenant, and a failed read is an error, never an empty list', async () => {
    const { db, calls } = fakeDb([row({}), row({ id: 'b', tenant_slug: 'beta' })])
    const result = await listChangeRequests(ok(owner('alpha')), db)
    expect(result).toMatchObject({ ok: true })
    expect(result.ok && result.requests.map((r) => r.tenantSlug)).toEqual(['alpha'])
    expect(calls).toEqual(['select:alpha'])
    const failing = fakeDb([], { readError: true })
    expect(await listChangeRequests(ok(owner('alpha')), failing.db)).toMatchObject({ ok: false, code: 'failed' })
  })

  it('even if the database leaks other tenants’ rows, the code shows only hers (defence in depth)', async () => {
    const { db } = fakeDb([row({}), row({ id: 'b', tenant_slug: 'beta', request_text: 'beta secret plans' })], { leaky: true })
    const result = await listChangeRequests(ok(owner('alpha')), db)
    expect(result.ok && result.requests.map((r) => r.tenantSlug)).toEqual(['alpha'])
    const leakyApprove = fakeDb([row({ tenant_slug: 'beta' })], { leaky: true, rpc: () => ({ data: 'approved', error: null }) })
    expect(await approveChangeRequest(ok(owner('alpha')), leakyApprove.db, R1)).toMatchObject({ ok: false, code: 'not_found' })
    expect(leakyApprove.calls.some((c) => c.startsWith('rpc:'))).toBe(false)
  })

  it('drops a non-https preview link instead of showing it', async () => {
    const { db } = fakeDb([row({ preview_url: 'javascript:alert(1)' })])
    const result = await listChangeRequests(ok(owner('alpha')), db)
    expect(result.ok && result.requests[0].previewUrl).toBeNull()
  })

  it('wrong-tenant owner: another tenant’s request is not found and no write is attempted', async () => {
    const { db, calls } = fakeDb([row({ tenant_slug: 'alpha' })])
    expect(await approveChangeRequest(ok(owner('beta')), db, R1)).toMatchObject({ ok: false, code: 'not_found' })
    expect(calls.some((c) => c.startsWith('rpc:'))).toBe(false)
  })

  it('approve from any status other than preview_ready is refused before the database write', async () => {
    for (const status of ['submitted', 'in_progress', 'approved', 'published', 'rejected', 'rolled_back']) {
      const { db, calls } = fakeDb([row({ status })])
      expect(await approveChangeRequest(ok(owner('alpha')), db, R1), status).toMatchObject({ ok: false, code: 'not_allowed' })
      expect(calls.some((c) => c.startsWith('rpc:')), status).toBe(false)
    }
  })

  it('a correct aal2 owner approves a waiting preview through the database function', async () => {
    const { db, calls } = fakeDb([row({})], { rpc: () => ({ data: 'approved', error: null }) })
    expect(await approveChangeRequest(ok(owner('alpha')), db, R1)).toEqual({ ok: true, status: 'approved' })
    expect(calls).toContain('rpc:portal_approve_change_request')
  })

  it('if the database says wrong status (a race), the owner sees not allowed, not success', async () => {
    const { db } = fakeDb([row({})], { rpc: () => ({ data: null, error: { message: 'portal_wrong_status' } }) })
    expect(await approveChangeRequest(ok(owner('alpha')), db, R1)).toMatchObject({ ok: false, code: 'not_allowed' })
  })

  it('a database refusal for a stale second factor maps to verify_second_factor', async () => {
    const { db } = fakeDb([row({})], { rpc: () => ({ data: null, error: { message: 'portal_not_owner' } }) })
    expect(await approveChangeRequest(ok(owner('alpha')), db, R1)).toMatchObject({ ok: false, code: 'verify_second_factor' })
  })

  it('a malformed request id never reaches the database', async () => {
    const { db, calls } = fakeDb([row({})])
    expect(await approveChangeRequest(ok(owner('alpha')), db, "1' or '1'='1")).toMatchObject({ ok: false, code: 'not_found' })
    expect(calls).toEqual([])
  })

  it('ask for edits needs a note, then goes through its database function', async () => {
    const empty = fakeDb([row({})])
    expect(await askForChangeEdits(ok(owner('alpha')), empty.db, R1, '  ')).toMatchObject({ ok: false, code: 'invalid' })
    expect(empty.calls).toEqual([])
    const { db, calls } = fakeDb([row({})], { rpc: () => ({ data: 'in_progress', error: null }) })
    expect(await askForChangeEdits(ok(owner('alpha')), db, R1, 'Use the other photo')).toEqual({ ok: true, status: 'in_progress' })
    expect(calls).toContain('rpc:portal_ask_for_change_edits')
  })

  it('submit validates first, then calls the create function and returns the new id', async () => {
    const bad = fakeDb([])
    expect(await submitChangeRequest(ok(owner('alpha')), bad.db, { page: 'blog', requestText: 'Change it please' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(bad.calls).toEqual([])
    const { db, calls } = fakeDb([], { rpc: () => ({ data: R1, error: null }) })
    expect(await submitChangeRequest(ok(owner('alpha')), db, { page: 'home', requestText: 'Change it please' })).toEqual({ ok: true, id: R1 })
    expect(calls).toEqual(['rpc:portal_create_change_request'])
  })
})
