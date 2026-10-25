import { describe, it, expect, vi } from 'vitest'
import { filterSendableRecipients } from '../send-gate'

type Rows = { data: unknown; error: unknown }

/** Minimal client mock: each table resolves to the rows given; records the filters used. */
function db(tables: Record<string, Rows>) {
  const calls: Array<{ table: string; eq: unknown[][]; or: string[] }> = []
  return {
    calls,
    from(table: string) {
      const rec = { table, eq: [] as unknown[][], or: [] as string[] }
      calls.push(rec)
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = (...a: unknown[]) => (rec.eq.push(a), q)
      q.or = (f: string) => (rec.or.push(f), q)
      q.then = (resolve: (v: unknown) => unknown) => resolve(tables[table] ?? { data: [], error: null })
      return q
    },
  }
}

const clear = vi.fn(async () => 'clear' as const)

describe('filterSendableRecipients (Spam Act 2003: consent + suppression before any marketing send)', () => {
  it('keeps only recipients with recorded marketing consent, matching case-insensitively', async () => {
    const client = db({
      crm_leads: { data: [{ email: 'yes@x.com' }], error: null },
      crm_contacts: { data: [{ primary_email: 'also@x.com' }], error: null },
    })
    const r = await filterSendableRecipients(client as never, 'f1', [{ email: 'YES@x.com' }, { email: 'also@x.com' }, { email: 'no@x.com' }], { checkSuppression: clear })
    expect(r.allowed.map((x) => x.email)).toEqual(['YES@x.com', 'also@x.com'])
    expect(r.skipped).toMatchObject({ noConsent: 1, suppressed: 0, suppressionUnknown: 0 })
  })

  it('scopes the consent reads to the founder and to consent = true', async () => {
    const client = db({ crm_leads: { data: [], error: null }, crm_contacts: { data: [], error: null } })
    await filterSendableRecipients(client as never, 'f1', [{ email: 'a@x.com' }], { checkSuppression: clear })
    expect(client.calls.length).toBe(2)
    for (const c of client.calls) {
      expect(c.eq).toContainEqual(['founder_id', 'f1'])
      expect(c.eq).toContainEqual(['marketing_consent', true])
    }
  })

  it('drops a consented recipient who is on the suppression or unsubscribe list', async () => {
    const client = db({ crm_leads: { data: [{ email: 'a@x.com' }, { email: 'b@x.com' }], error: null }, crm_contacts: { data: [], error: null } })
    const check = vi.fn(async (a: string) => (a === 'b@x.com' ? ('suppressed' as const) : ('clear' as const)))
    const r = await filterSendableRecipients(client as never, 'f1', [{ email: 'a@x.com' }, { email: 'b@x.com' }], { checkSuppression: check })
    expect(r.allowed.map((x) => x.email)).toEqual(['a@x.com'])
    expect(r.skipped.suppressed).toBe(1)
  })

  it('fails closed when suppression state is unknown (no key, timeout, bad response)', async () => {
    const client = db({ crm_leads: { data: [{ email: 'a@x.com' }], error: null }, crm_contacts: { data: [], error: null } })
    const r = await filterSendableRecipients(client as never, 'f1', [{ email: 'a@x.com' }], { checkSuppression: async () => 'unknown' })
    expect(r.allowed).toEqual([])
    expect(r.skipped.suppressionUnknown).toBe(1)
  })

  it('throws, so the caller sends nothing, when the consent data cannot be read', async () => {
    const a = db({ crm_leads: { data: null, error: { message: 'boom' } }, crm_contacts: { data: [], error: null } })
    await expect(filterSendableRecipients(a as never, 'f1', [{ email: 'a@x.com' }], { checkSuppression: clear })).rejects.toThrow(/consent/i)
    const b = db({ crm_leads: { data: [], error: null }, crm_contacts: { data: null, error: { message: 'boom' } } })
    await expect(filterSendableRecipients(b as never, 'f1', [{ email: 'a@x.com' }], { checkSuppression: clear })).rejects.toThrow(/consent/i)
  })

  it('drops malformed recipients and de-duplicates', async () => {
    const client = db({ crm_leads: { data: [{ email: 'a@x.com' }], error: null }, crm_contacts: { data: [], error: null } })
    const r = await filterSendableRecipients(client as never, 'f1', [{ email: 'a@x.com' }, { email: 'A@x.com' }, { email: '' }, {} as never], { checkSuppression: clear })
    expect(r.allowed).toHaveLength(1)
  })

  it('finds consent stored with different case or stray whitespace, via an ilike net checked exactly', async () => {
    const client = db({ crm_leads: { data: [{ email: '  Alice@Example.test  ' }, { email: 'xalice@example.test' }], error: null }, crm_contacts: { data: [], error: null } })
    const r = await filterSendableRecipients(client as never, 'f1', [{ email: 'alice@example.test' }, { email: 'lice@example.test' }], { checkSuppression: clear })
    expect(r.allowed.map((x) => x.email)).toEqual(['alice@example.test'])
    expect(r.skipped.noConsent).toBe(1)
    expect(client.calls[0].or[0]).toContain('email.ilike."%alice@example.test%"')
  })

  it('escapes LIKE wildcards in the address', async () => {
    const client = db({ crm_leads: { data: [], error: null }, crm_contacts: { data: [], error: null } })
    await filterSendableRecipients(client as never, 'f1', [{ email: 'a_b@x.com' }], { checkSuppression: clear })
    expect(client.calls[0].or[0]).toContain('a\\\\_b@x.com')
  })
})
