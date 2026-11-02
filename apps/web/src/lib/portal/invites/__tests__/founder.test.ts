import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { hashInviteCode, normaliseInviteCode } from '../code'
import { createInvite, inviteStatus, listInvites, parseNewInvite, revokeInvite } from '../founder'
import { BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, BRII_TENANT } from '../__fixtures__/brii'

const NOW = new Date('2026-11-02T08:00:00.000Z')
const FOUNDER = '00000000-0000-4000-8000-0000000000f0'

/** A fake service-role client that records what each call was given. */
function fakeDb(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const calls: { method: string; args: unknown[] }[] = []
  const chain: Record<string, unknown> = {}
  for (const method of ['from', 'insert', 'select', 'single', 'order', 'limit', 'update', 'eq', 'is']) {
    chain[method] = vi.fn((...args: unknown[]) => { calls.push({ method, args }); return chain })
  }
  const settle = { data: result.data ?? null, error: result.error ?? null }
  chain.then = (resolve: (v: typeof settle) => unknown) => resolve(settle)
  return { db: chain as unknown as SupabaseClient, calls }
}

describe('parseNewInvite', () => {
  it('tidies the form and defaults to 14 days', () => {
    expect(parseNewInvite({ tenantSlug: ' BRII ', boundEmail: ' Owner@Brii.test ' })).toEqual({
      ok: true, value: { tenantSlug: 'brii', boundEmail: BRII_OWNER_EMAIL, expiryDays: 14 },
    })
    expect(parseNewInvite({ tenantSlug: 'brii', boundEmail: '' })).toMatchObject({ ok: true, value: { boundEmail: null } })
  })

  it.each([
    [{ tenantSlug: 'Brii Co' }, /short name/],
    [{ tenantSlug: '' }, /short name/],
    [{ tenantSlug: 'brii', boundEmail: 'not-an-email' }, /email/],
    [{ tenantSlug: 'brii', expiryDays: 0 }, /1 to 30/],
    [{ tenantSlug: 'brii', expiryDays: 31 }, /1 to 30/],
    [{ tenantSlug: 'brii', expiryDays: 1.5 }, /1 to 30/],
  ])('refuses %o', (input, message) => {
    const r = parseNewInvite(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(message)
  })
})

describe('createInvite', () => {
  it('saves the hash and the hint, never the code, and returns the code once', async () => {
    const saved = {
      id: '11111111-1111-4111-8111-111111111111', code_hint: 'JKMN', tenant_slug: BRII_TENANT, bound_email: BRII_OWNER_EMAIL,
      expires_at: '2026-11-16T08:00:00.000Z', revoked_at: null, created_at: NOW.toISOString(), portal_invite_redemptions: [],
    }
    const { db, calls } = fakeDb({ data: saved })
    const r = await createInvite(db, { tenantSlug: 'brii', boundEmail: BRII_OWNER_EMAIL }, FOUNDER, NOW, () => BRII_EXAMPLE_CODE)

    expect(r).toMatchObject({ ok: true, code: BRII_EXAMPLE_CODE, invite: { status: 'active', hint: 'JKMN' } })
    const insert = calls.find((c) => c.method === 'insert')!.args[0] as Record<string, unknown>
    const plain = normaliseInviteCode(BRII_EXAMPLE_CODE)!
    expect(insert).toEqual({
      code_hash: hashInviteCode(plain),
      code_hint: 'JKMN',
      tenant_slug: 'brii',
      bound_email: BRII_OWNER_EMAIL,
      expires_at: '2026-11-16T08:00:00.000Z',
      created_by: FOUNDER,
    })
    // no plaintext anywhere in what was sent to the database
    const sent = JSON.stringify(calls)
    expect(sent).not.toContain(plain)
    expect(sent).not.toContain(BRII_EXAMPLE_CODE)
  })

  it('a bad form sends nothing to the database', async () => {
    const { db, calls } = fakeDb()
    expect(await createInvite(db, { tenantSlug: 'BAD SLUG' }, FOUNDER, NOW)).toMatchObject({ ok: false })
    expect(calls).toHaveLength(0)
  })

  it('a failed save is an error, never a code', async () => {
    const { db } = fakeDb({ error: { message: 'boom' } })
    const r = await createInvite(db, { tenantSlug: 'brii' }, FOUNDER, NOW, () => BRII_EXAMPLE_CODE)
    expect(r).toEqual({ ok: false, error: 'Could not save the code. Nothing was created.' })
  })
})

describe('listInvites and inviteStatus', () => {
  it('works out each status, with used and cancelled winning over expired', () => {
    const base = { expires_at: '2026-11-10T00:00:00.000Z', revoked_at: null, portal_invite_redemptions: [] }
    expect(inviteStatus(base, NOW)).toBe('active')
    expect(inviteStatus({ ...base, expires_at: '2026-11-01T00:00:00.000Z' }, NOW)).toBe('expired')
    expect(inviteStatus({ ...base, revoked_at: '2026-11-01T00:00:00.000Z', expires_at: '2026-11-01T00:00:00.000Z' }, NOW)).toBe('revoked')
    expect(inviteStatus({ ...base, revoked_at: NOW.toISOString(), portal_invite_redemptions: [{ redeemed_at: NOW.toISOString() }] }, NOW)).toBe('used')
  })

  it('a failed read throws, so it never looks like "no codes yet"', async () => {
    const { db } = fakeDb({ error: { message: 'permission denied' } })
    await expect(listInvites(db, NOW)).rejects.toThrow(/portal invites read failed/)
  })

  it('never asks the database for the hash', async () => {
    const { db, calls } = fakeDb({ data: [] })
    expect(await listInvites(db, NOW)).toEqual([])
    expect(String(calls.find((c) => c.method === 'select')!.args[0])).not.toContain('code_hash')
  })
})

describe('revokeInvite', () => {
  it('cancels only a code not cancelled yet', async () => {
    const { db, calls } = fakeDb()
    expect(await revokeInvite(db, '11111111-1111-4111-8111-111111111111', NOW)).toEqual({ ok: true })
    expect(calls.find((c) => c.method === 'update')!.args[0]).toEqual({ revoked_at: NOW.toISOString() })
    expect(calls.find((c) => c.method === 'is')!.args).toEqual(['revoked_at', null])
  })

  it('refuses a malformed id without asking the database', async () => {
    const { db, calls } = fakeDb()
    expect(await revokeInvite(db, "1' or '1'='1", NOW)).toEqual({ ok: false, error: 'Unknown code.' })
    expect(calls).toHaveLength(0)
  })
})
