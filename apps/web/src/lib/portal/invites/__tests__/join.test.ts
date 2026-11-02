import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { hashInviteCode, normaliseInviteCode } from '../code'
import { checkInviteForLink, linkClientKey, normaliseEmail, redeemInvite, type RedeemClient } from '../join'
import { REDEEM_COPY, REDEEM_OUTCOMES } from '../outcomes'
import { BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL } from '../__fixtures__/brii'

const NOW = new Date('2026-11-02T08:00:00.000Z')
const KEY = linkClientKey('203.0.113.9')

function lookupDb(opts: { allowed?: boolean; limitError?: boolean; row?: Record<string, unknown> | null; readError?: boolean }) {
  const rpc = vi.fn(async () => ({ data: opts.allowed ?? true, error: opts.limitError ? { message: 'down' } : null }))
  const eq = vi.fn(() => ({ maybeSingle: async () => ({ data: opts.row ?? null, error: opts.readError ? { message: 'down' } : null }) }))
  const from = vi.fn(() => ({ select: () => ({ eq }) }))
  return { db: { rpc, from } as unknown as SupabaseClient, rpc, from, eq }
}

const usable = { expires_at: '2026-11-16T08:00:00.000Z', revoked_at: null, bound_email: null, portal_invite_redemptions: [] }

describe('linkClientKey', () => {
  it('hashes the first forwarded address and never returns it', () => {
    expect(KEY).toMatch(/^[0-9a-f]{64}$/)
    expect(KEY).not.toContain('203.0.113.9')
    expect(linkClientKey('203.0.113.9, 10.0.0.1')).toBe(KEY)
    expect(linkClientKey(null)).toBe(linkClientKey('unknown'))
  })
})

describe('normaliseEmail', () => {
  it('lower-cases and refuses junk', () => {
    expect(normaliseEmail(' Owner@Brii.test ')).toBe(BRII_OWNER_EMAIL)
    expect(normaliseEmail('owner')).toBeNull()
    expect(normaliseEmail(undefined)).toBeNull()
  })
})

describe('checkInviteForLink (before a sign-in link is sent)', () => {
  it('counts against the limit first, even for a malformed code', async () => {
    const { db, rpc, from } = lookupDb({})
    expect(await checkInviteForLink(db, 'nonsense', BRII_OWNER_EMAIL, KEY, NOW)).toBe('not_found')
    expect(rpc).toHaveBeenCalledWith('portal_invite_link_allowed', { p_client_key: KEY })
    expect(from).not.toHaveBeenCalled()
  })

  it('refuses when the limit is reached, without looking the code up', async () => {
    const { db, from } = lookupDb({ allowed: false, row: usable })
    expect(await checkInviteForLink(db, BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, KEY, NOW)).toBe('rate_limited')
    expect(from).not.toHaveBeenCalled()
  })

  it('looks the code up by its hash only', async () => {
    const { db, eq } = lookupDb({ row: usable })
    expect(await checkInviteForLink(db, BRII_EXAMPLE_CODE.toLowerCase(), BRII_OWNER_EMAIL, KEY, NOW)).toBe('ok')
    expect(eq).toHaveBeenCalledWith('code_hash', hashInviteCode(normaliseInviteCode(BRII_EXAMPLE_CODE)!))
  })

  it.each([
    ['unknown', null, 'not_found'],
    ['cancelled', { ...usable, revoked_at: '2026-11-01T00:00:00.000Z' }, 'revoked'],
    ['used', { ...usable, portal_invite_redemptions: [{ redeemed_at: '2026-11-01T00:00:00.000Z' }] }, 'used'],
    ['expired', { ...usable, expires_at: '2026-11-02T07:59:59.000Z' }, 'expired'],
    ['for someone else', { ...usable, bound_email: 'someone@else.test' }, 'wrong_email'],
    ['for this email', { ...usable, bound_email: BRII_OWNER_EMAIL }, 'ok'],
  ])('a code that is %s answers %s', async (_label, row, want) => {
    const { db } = lookupDb({ row })
    expect(await checkInviteForLink(db, BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, KEY, NOW)).toBe(want)
  })

  it('a failed limit or read throws, never "ok"', async () => {
    await expect(checkInviteForLink(lookupDb({ limitError: true }).db, BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, KEY, NOW)).rejects.toThrow()
    await expect(checkInviteForLink(lookupDb({ readError: true }).db, BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, KEY, NOW)).rejects.toThrow()
  })
})

describe('redeemInvite (on the owner session)', () => {
  const client = (data: unknown, error: { message: string; code?: string } | null = null) => {
    const rpc = vi.fn(async () => ({ data, error }))
    return { client: { rpc } as unknown as RedeemClient, rpc }
  }

  it('sends only the hash to the database function', async () => {
    const { client: c, rpc } = client('redeemed')
    expect(await redeemInvite(c, BRII_EXAMPLE_CODE)).toBe('redeemed')
    expect(rpc).toHaveBeenCalledWith('portal_redeem_invite', { p_code_hash: hashInviteCode(normaliseInviteCode(BRII_EXAMPLE_CODE)!) })
  })

  it('an aal1 session is told to verify, not let in', async () => {
    expect(await redeemInvite(client('needs_second_factor').client, BRII_EXAMPLE_CODE)).toBe('needs_second_factor')
  })

  it.each(['expired', 'revoked', 'used', 'wrong_email', 'rate_limited'])('passes the refusal %s through', async (o) => {
    expect(await redeemInvite(client(o).client, BRII_EXAMPLE_CODE)).toBe(o)
  })

  it('no code, a malformed code, signed out, a failure and an unknown answer never read as success', async () => {
    const { client: c, rpc } = client('redeemed')
    expect(await redeemInvite(c, '')).toBe('no_code')
    expect(await redeemInvite(c, 'short')).toBe('not_found')
    expect(rpc).not.toHaveBeenCalled()
    expect(await redeemInvite(client(null, { message: 'portal_invite_not_signed_in', code: '42501' }).client, BRII_EXAMPLE_CODE)).toBe('signed_out')
    expect(await redeemInvite(client(null, { message: 'down' }).client, BRII_EXAMPLE_CODE)).toBe('error')
    expect(await redeemInvite(client('granted').client, BRII_EXAMPLE_CODE)).toBe('error')
  })

  it('every outcome has plain words for the owner', () => {
    for (const o of REDEEM_OUTCOMES) expect(REDEEM_COPY[o].title.length).toBeGreaterThan(0)
  })
})
