import { describe, expect, it, vi } from 'vitest'

import { PUBLIC_COLUMNS, getPublishedCard } from '../published'

const row = {
  card_slug: 'sam',
  display_name: 'Sam',
  role_title: 'Owner',
  business_name: 'Sam Co',
  email: 'sam@example.com',
  phone: '+61 400 000 001',
  service_area: 'Brisbane',
  published_at: '2026-10-25T00:00:00Z',
}

function client(result: { data: unknown; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { c: { from } as never, from, select, eq }
}

describe('getPublishedCard', () => {
  it('asks only for the public columns of card_profiles by slug', async () => {
    const m = client({ data: row, error: null })
    await getPublishedCard('sam', m.c)
    expect(m.from).toHaveBeenCalledWith('card_profiles')
    expect(m.select).toHaveBeenCalledWith(PUBLIC_COLUMNS)
    expect(PUBLIC_COLUMNS.split(',').map((s) => s.trim())).toEqual([
      'card_slug', 'display_name', 'role_title', 'business_name', 'email', 'phone', 'service_area', 'published_at',
    ])
    expect(m.eq).toHaveBeenCalledWith('card_slug', 'sam')
  })

  it('returns exactly the public fields, with no private key even if the row carries one', async () => {
    const m = client({ data: { ...row, owner_founder_id: 'secret', founder_id: 'secret', created_at: 'x' }, error: null })
    const card = await getPublishedCard('sam', m.c)
    expect(Object.keys(card!).sort()).toEqual(['businessName', 'displayName', 'email', 'phone', 'roleTitle', 'serviceArea', 'slug'])
    expect(JSON.stringify(card)).not.toContain('secret')
  })

  it('returns null for an unknown slug, a draft row, and an invalid slug without calling the database', async () => {
    expect(await getPublishedCard('sam', client({ data: null, error: null }).c)).toBeNull()
    expect(await getPublishedCard('sam', client({ data: { ...row, published_at: null }, error: null }).c)).toBeNull()
    const m = client({ data: row, error: null })
    expect(await getPublishedCard('../x', m.c)).toBeNull()
    expect(m.from).not.toHaveBeenCalled()
  })

  it('throws on a failed read instead of looking like an empty result', async () => {
    await expect(getPublishedCard('sam', client({ data: null, error: { message: 'boom' } }).c)).rejects.toThrow('boom')
  })
})
