import { describe, expect, it } from 'vitest'
import {
  filterInbox,
  contactEmailFilter,
  loadInbox,
  mergeInbox,
  parseSourceParam,
  type InboxClient,
  type InboxItem,
} from '../inbox'

const NOW = new Date('2026-10-25T00:00:00.000Z')

const lead = (over: Record<string, unknown> = {}) => ({
  id: 'l1', first_name: 'Ann', last_name: 'Lee', email: 'Ann@Example.com', company: 'Acme',
  message: 'Need a quote', interests: null, source: 'website_form',
  additional_data: { business_key: 'dr' }, captured_at: '2026-10-20T00:00:00Z', ...over,
})
const enquiry = (over: Record<string, unknown> = {}) => ({
  id: 'e1', created_at: '2026-10-22T00:00:00Z', card_slug: 'phill', first_name: 'Bob',
  business: 'Bob Co', ask: 'Call me about water damage', reply_email: 'bob@example.com', ...over,
})
const feedback = (over: Record<string, unknown> = {}) => ({
  id: 'f1', created_at: '2026-10-21T00:00:00Z', card_slug: 'phill', first_name: 'Cy',
  answers: { liked: 'the card', wish: 'more photos' }, ...over,
})

type Result = { data: unknown[] | null; error: { message: string } | null }

/** Fake client: records the chain per table and resolves the configured result. */
function fakeClient(results: Record<string, Result>) {
  const calls: Record<string, Array<[string, unknown[]]>> = {}
  const client: InboxClient = {
    from(table: string) {
      calls[table] = []
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'gte', 'in', 'or', 'order', 'limit']) {
        builder[m] = (...args: unknown[]) => { calls[table].push([m, args]); return builder }
      }
      builder.then = (res: (r: Result) => unknown) => Promise.resolve(results[table]).then(res)
      return builder as never
    },
  }
  return { client, calls }
}

const ok = (data: unknown[]): Result => ({ data, error: null })

describe('mergeInbox', () => {
  it('merges the three sources newest first with labels and contact links', () => {
    const items = mergeInbox(
      { leads: [lead()], enquiries: [enquiry()], feedback: [feedback()] },
      new Map([['ann@example.com', 'c-ann']]),
    )
    expect(items.map((i) => i.id)).toEqual(['card_enquiry:e1', 'card_feedback:f1', 'website_lead:l1'])
    expect(items[2]).toMatchObject({ source: 'website_lead', name: 'Ann Lee', contactId: 'c-ann', preview: 'Need a quote' })
    expect(items[0].contactId).toBeNull()
    expect(items[1].preview).toBe('liked: the card; wish: more photos')
  })

  it('truncates long previews', () => {
    const [item] = mergeInbox({ leads: [lead({ message: 'x'.repeat(500) })], enquiries: [], feedback: [] }, new Map())
    expect(item.preview.length).toBeLessThanOrEqual(160)
    expect(item.preview.endsWith('...')).toBe(true)
  })
})

describe('filterInbox / parseSourceParam', () => {
  const items = mergeInbox({ leads: [lead()], enquiries: [enquiry()], feedback: [feedback()] }, new Map())
  it('filters by source and passes everything when null', () => {
    expect(filterInbox(items, 'card_feedback').map((i: InboxItem) => i.id)).toEqual(['card_feedback:f1'])
    expect(filterInbox(items, null)).toHaveLength(3)
  })
  it('parses only known source values', () => {
    expect(parseSourceParam('card_enquiry')).toBe('card_enquiry')
    expect(parseSourceParam('bogus')).toBeNull()
    expect(parseSourceParam(undefined)).toBeNull()
    expect(parseSourceParam(['card_enquiry'])).toBeNull()
  })
})

describe('loadInbox', () => {
  it('queries the last 90 days, founder-scoped for leads, and links contacts by email', async () => {
    const { client, calls } = fakeClient({
      crm_leads: ok([lead()]),
      card_enquiries: ok([enquiry()]),
      card_feedback: ok([]),
      contacts: ok([{ id: 'c-ann', email: 'ann@example.com' }]),
    })
    const r = await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(r.failedSources).toEqual([])
    expect(r.items.find((i) => i.source === 'website_lead')?.contactId).toBe('c-ann')
    const since = '2026-07-27T00:00:00.000Z'
    expect(calls.crm_leads).toContainEqual(['gte', ['captured_at', since]])
    expect(calls.crm_leads).toContainEqual(['eq', ['founder_id', 'f-1']])
    expect(calls.card_enquiries).toContainEqual(['gte', ['created_at', since]])
  })

  it('reports a failed source instead of an empty inbox', async () => {
    const { client } = fakeClient({
      crm_leads: ok([lead()]),
      card_enquiries: { data: null, error: { message: 'permission denied' } },
      card_feedback: ok([]),
      contacts: ok([]),
    })
    const r = await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(r.failedSources).toEqual(['card_enquiry'])
    expect(r.items.map((i) => i.source)).toEqual(['website_lead'])
  })

  it('treats a thrown query as a failure and flags failed contact links', async () => {
    const { client } = fakeClient({
      crm_leads: ok([lead()]),
      card_enquiries: ok([]),
      card_feedback: ok([]),
      contacts: { data: null, error: { message: 'boom' } },
    })
    const r = await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(r.contactLinksFailed).toBe(true)
    expect(r.items[0].contactId).toBeNull()
    const thrower: InboxClient = { from: () => { throw new Error('down') } }
    const t = await loadInbox(thrower, { founderId: 'f-1', now: NOW })
    expect(t.failedSources).toEqual(['website_lead', 'card_enquiry', 'card_feedback'])
  })

  it('returns an empty successful result when every source is empty', async () => {
    const { client } = fakeClient({ crm_leads: ok([]), card_enquiries: ok([]), card_feedback: ok([]), contacts: ok([]) })
    const r = await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(r).toMatchObject({ items: [], failedSources: [], contactLinksFailed: false, truncated: [] })
  })
  it('links a contact whose stored email has different case (the query itself must be case-insensitive)', async () => {
    // Query-enforcing fake: `in` is exact (like SQL), `or` with ilike terms is case-insensitive.
    // A fake that returns the configured contact regardless of the filter would hide this bug.
    const stored = [{ id: 'c-ann', email: 'Ann@Example.com' }, { id: 'c-other', email: 'zed@example.com' }]
    const filters: string[] = []
    const client: InboxClient = {
      from(table: string) {
        const rows: Record<string, unknown[]> = {
          crm_leads: [lead({ email: 'ann@example.com' }), lead({ id: 'l2', email: 'ANN@EXAMPLE.COM' })],
          card_enquiries: [],
          card_feedback: [],
          contacts: stored,
        }
        let keep = (_r: unknown) => true
        const builder: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'gte', 'order', 'limit']) builder[m] = () => builder
        builder.in = (col: string, values: string[]) => {
          filters.push(`in:${values.join('|')}`)
          keep = (r) => values.includes((r as Record<string, string>)[col])
          return builder
        }
        builder.or = (expr: string) => {
          filters.push(`or:${expr}`)
          const wanted = [...expr.matchAll(/email\.ilike\."([^"]*)"/g)].map((m) => m[1].toLowerCase())
          keep = (r) => wanted.includes(String((r as Record<string, string>).email).toLowerCase())
          return builder
        }
        builder.then = (res: (r: Result) => unknown) =>
          Promise.resolve(ok(rows[table].filter((r) => keep(r)))).then(res)
        return builder as never
      },
    }
    const r = await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(filters.length).toBeGreaterThan(0)
    expect(r.contactLinksFailed).toBe(false)
    expect(r.items.filter((i) => i.source === 'website_lead').map((i) => i.contactId)).toEqual(['c-ann', 'c-ann'])
  })

  it('quotes or-filter values so commas, parentheses and quotes in an address cannot break the filter', async () => {
    const seen: string[] = []
    const client: InboxClient = {
      from(table: string) {
        const builder: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'gte', 'in', 'order', 'limit']) builder[m] = () => builder
        builder.or = (expr: string) => { seen.push(expr); return builder }
        builder.then = (res: (r: Result) => unknown) =>
          Promise.resolve(ok(table === 'crm_leads' ? [lead({ email: 'a,b(c)@example.com' })] : [])).then(res)
        return builder as never
      },
    }
    await loadInbox(client, { founderId: 'f-1', now: NOW })
    expect(seen).toEqual(['email.ilike."a,b(c)@example.com"'])
  })

  // UNI-3007: '_' and '%' are LIKE wildcards (and PostgREST turns '*' into '%'), so an address like
  // ann_lee@x.com used to match annxlee@x.com too: an over-wide read of the founder's contacts.
  // Emulates PostgREST: unquote ("\\" -> "\", "\"" -> "\""), '*' -> '%', then ILIKE with '\' as escape.
  const postgrestIlikeMatches = (expr: string, stored: string) =>
    [...expr.matchAll(/email\.ilike\."((?:[^"\\]|\\.)*)"/g)].some(([, quoted]) => {
      const pattern = quoted.replace(/\\(.)/g, '$1').replace(/\*/g, '%')
      let re = ''
      for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i]
        if (ch === '\\' && i + 1 < pattern.length) re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        else if (ch === '%') re += '.*'
        else if (ch === '_') re += '.'
        else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }
      return new RegExp(`^${re}$`, 'is').test(stored)
    })

  it('UNI-3007 escapes LIKE wildcards so an address matches only itself (any case)', () => {
    const expr = contactEmailFilter(['ann_lee@x.com', '100%real@x.com', 'back\\slash@x.com'])
    expect(postgrestIlikeMatches(expr, 'ANN_LEE@x.com')).toBe(true)
    expect(postgrestIlikeMatches(expr, 'annxlee@x.com')).toBe(false)
    expect(postgrestIlikeMatches(expr, '100%real@x.com')).toBe(true)
    expect(postgrestIlikeMatches(expr, '100-and-more-real@x.com')).toBe(false)
    expect(postgrestIlikeMatches(expr, 'back\\slash@x.com')).toBe(true)
    expect(postgrestIlikeMatches(expr, 'backslash@x.com')).toBe(false)
  })

  it('UNI-3007 never sends an address containing the PostgREST * wildcard or a double quote', () => {
    expect(contactEmailFilter(['a*b@x.com', 'say"hi"@x.com'])).toBe('')
    expect(postgrestIlikeMatches(contactEmailFilter(['a*b@x.com', 'ok@x.com']), 'aXXXb@x.com')).toBe(false)
  })
})
