import { describe, expect, it, vi } from 'vitest'

import { cardReference, submitCardEnquiry } from '../enquiry'

type R = { data: unknown; error: { message: string } | null }

function client(opts: { profile?: R; rpc?: R }) {
  const profile = opts.profile ?? { data: { card_slug: 'sam', published_at: '2026-10-25T00:00:00Z' }, error: null }
  const rpcResult = opts.rpc ?? { data: { id: 'f3a1c0de-0000-4000-8000-000000000001', created_at: '2026-10-25T01:02:03Z' }, error: null }
  const rpcCall = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'card_profiles') return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(profile) }) }) }
    throw new Error(`unexpected table ${table}: the insert goes through the guarded function`)
  })
  const rpc = (fn: string, args: Record<string, unknown>) => {
    rpcCall(fn, args)
    return { single: () => Promise.resolve(rpcResult) }
  }
  return { c: { from, rpc } as never, from, rpcCall }
}

const good = { firstName: 'Jo', ask: 'Can you call me?', business: 'Jo Co', replyEmail: 'jo@example.com' }

describe('submitCardEnquiry (non-production receipt)', () => {
  it('returns a receipt only after the guarded insert returned a row, carrying that row id', async () => {
    const m = client({})
    const r = await submitCardEnquiry(m.c, 'sam', good)
    expect(r).toEqual({ ok: true, receipt: { id: 'f3a1c0de-0000-4000-8000-000000000001', reference: 'LC-F3A1C0DE0000', status: 'received', acceptedAt: '2026-10-25T01:02:03Z', ownerNotified: false } })
    expect(m.rpcCall).toHaveBeenCalledWith('card_submit_enquiry', {
      p_card_slug: 'sam', p_first_name: 'Jo', p_business: 'Jo Co', p_ask: 'Can you call me?', p_reply_email: 'jo@example.com', p_source: 'card-profile',
    })
  })

  it('a retry sends the identical key (slug, email, ask) so the database can return the same row', async () => {
    const m = client({})
    const a = await submitCardEnquiry(m.c, 'sam', good)
    const b = await submitCardEnquiry(m.c, 'sam', { ...good, ask: '  Can you call me?  ' })
    expect(b).toEqual(a)
    expect(m.rpcCall).toHaveBeenCalledTimes(2)
    expect(m.rpcCall.mock.calls[1][1]).toEqual(m.rpcCall.mock.calls[0][1])
  })

  it('400 for a bad slug or a bad body, with no database call', async () => {
    const m = client({})
    for (const [slug, body] of [
      ['../x', good], ['sam', { ...good, firstName: '  ' }], ['sam', { ...good, ask: '' }], ['sam', { ...good, ask: 'a'.repeat(2001) }],
      ['sam', { ...good, firstName: 'a'.repeat(61) }], ['sam', { ...good, replyEmail: 'nope' }], ['sam', { ...good, business: 'b'.repeat(121) }],
    ] as const) {
      const r = await submitCardEnquiry(m.c, slug, body)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.status).toBe(400)
    }
    expect(m.from).not.toHaveBeenCalled()
    expect(m.rpcCall).not.toHaveBeenCalled()
  })

  it('404 for an unknown or unpublished card, and no insert', async () => {
    for (const profile of [{ data: null, error: null }, { data: { card_slug: 'sam', published_at: null }, error: null }]) {
      const m = client({ profile })
      const r = await submitCardEnquiry(m.c, 'sam', good)
      expect(r).toMatchObject({ ok: false, status: 404 })
      expect(m.rpcCall).not.toHaveBeenCalled()
    }
  })

  it('500, never a receipt, when the insert fails or returns no row', async () => {
    for (const rpc of [{ data: null, error: { message: 'rls' } }, { data: null, error: null }, { data: { created_at: 'x' }, error: null }]) {
      const r = await submitCardEnquiry(client({ rpc }).c, 'sam', good)
      expect(r).toMatchObject({ ok: false, status: 500 })
      expect(JSON.stringify(r)).not.toContain('receipt')
    }
  })

  it('500 when the published-check read itself fails', async () => {
    const m = client({ profile: { data: null, error: { message: 'down' } } })
    expect(await submitCardEnquiry(m.c, 'sam', good)).toMatchObject({ ok: false, status: 500 })
    expect(m.rpcCall).not.toHaveBeenCalled()
  })

  it('v1.4 G1 the reference is LC- plus the first 12 hex characters of the stored row id', () => {
    expect(cardReference('f3a1c0de-0000-4000-8000-000000000001')).toBe('LC-F3A1C0DE0000')
    expect(cardReference('0a1b2c3d-4e5f-4000-8000-000000000001')).toBe('LC-0A1B2C3D4E5F')
  })

  it('v1.4 G5 a per-card volume refusal from the database is a 429 with no receipt, not a 500', async () => {
    const r = await submitCardEnquiry(client({ rpc: { data: null, error: { message: 'card_enquiry_rate_limited' } } }).c, 'sam', good)
    expect(r).toMatchObject({ ok: false, status: 429 })
    expect(JSON.stringify(r)).not.toContain('receipt')
  })
})
