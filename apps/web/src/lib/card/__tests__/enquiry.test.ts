import { describe, expect, it, vi } from 'vitest'

import { submitCardEnquiry } from '../enquiry'

type R = { data: unknown; error: { message: string } | null }

function client(opts: { profile?: R; insert?: R }) {
  const profile = opts.profile ?? { data: { card_slug: 'sam', published_at: '2026-10-25T00:00:00Z' }, error: null }
  const insertResult = opts.insert ?? { data: { id: 'f3a1c0de-0000-4000-8000-000000000001', created_at: '2026-10-25T01:02:03Z' }, error: null }
  const insertRow = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'card_profiles') return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(profile) }) }) }
    return {
      insert: (row: unknown) => {
        insertRow(row)
        return { select: () => ({ single: () => Promise.resolve(insertResult) }) }
      },
    }
  })
  return { c: { from } as never, from, insertRow }
}

const good = { firstName: 'Jo', ask: 'Can you call me?', business: 'Jo Co', replyEmail: 'jo@example.com' }

describe('submitCardEnquiry (non-production receipt)', () => {
  it('returns a receipt only after the insert returned a row, carrying that row id', async () => {
    const m = client({})
    const r = await submitCardEnquiry(m.c, 'sam', good)
    expect(r).toEqual({ ok: true, receipt: { id: 'f3a1c0de-0000-4000-8000-000000000001', status: 'received', acceptedAt: '2026-10-25T01:02:03Z' } })
    expect(m.insertRow).toHaveBeenCalledWith({
      card_slug: 'sam', first_name: 'Jo', business: 'Jo Co', ask: 'Can you call me?', reply_email: 'jo@example.com', source: 'card-profile',
    })
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
  })

  it('404 for an unknown or unpublished card, and no insert', async () => {
    for (const profile of [{ data: null, error: null }, { data: { card_slug: 'sam', published_at: null }, error: null }]) {
      const m = client({ profile })
      const r = await submitCardEnquiry(m.c, 'sam', good)
      expect(r).toMatchObject({ ok: false, status: 404 })
      expect(m.insertRow).not.toHaveBeenCalled()
    }
  })

  it('500, never a receipt, when the insert fails or returns no row', async () => {
    for (const insert of [{ data: null, error: { message: 'rls' } }, { data: null, error: null }, { data: { created_at: 'x' }, error: null }]) {
      const r = await submitCardEnquiry(client({ insert }).c, 'sam', good)
      expect(r).toMatchObject({ ok: false, status: 500 })
      expect(JSON.stringify(r)).not.toContain('receipt')
    }
  })

  it('500 when the published-check read itself fails', async () => {
    const m = client({ profile: { data: null, error: { message: 'down' } } })
    expect(await submitCardEnquiry(m.c, 'sam', good)).toMatchObject({ ok: false, status: 500 })
    expect(m.insertRow).not.toHaveBeenCalled()
  })
})
