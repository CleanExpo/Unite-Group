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
  film_src: null as string | null,
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
      'card_slug', 'display_name', 'role_title', 'business_name', 'email', 'phone', 'service_area', 'published_at', 'film_src',
    ])
    expect(m.eq).toHaveBeenCalledWith('card_slug', 'sam')
  })

  it('returns exactly the public fields, with no private key even if the row carries one', async () => {
    const m = client({ data: { ...row, owner_founder_id: 'secret', founder_id: 'secret', created_at: 'x' }, error: null })
    const card = await getPublishedCard('sam', m.c)
    expect(Object.keys(card!).sort()).toEqual(['businessName', 'displayName', 'email', 'filmSrc', 'phone', 'roleTitle', 'serviceArea', 'slug'])
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

  it('carries the film path through when the row has a safe one', async () => {
    const m = client({ data: { ...row, film_src: '/cards/media/edition-orbit.mp4' }, error: null })
    expect((await getPublishedCard('sam', m.c))!.filmSrc).toBe('/cards/media/edition-orbit.mp4')
  })

  it('has no film when the column is null or the stored value is not a /cards/media/ path', async () => {
    expect((await getPublishedCard('sam', client({ data: row, error: null }).c))!.filmSrc).toBeNull()
    for (const bad of ['https://evil.example.invalid/x.mp4', '/cards/media/../x.mp4']) {
      expect((await getPublishedCard('sam', client({ data: { ...row, film_src: bad }, error: null }).c))!.filmSrc).toBeNull()
    }
  })

  // UNI-3528 review finding (schema-deploy-order): the app may deploy before the founder-gated migration is applied.
  describe('before the film_src migration is applied', () => {
    const { film_src: _omitted, ...oldRow } = row
    void _omitted
    function twoStep(first: { data: unknown; error: { message: string; code?: string } | null }, second?: { data: unknown; error: { message: string } | null }) {
      const maybeSingle = vi.fn().mockResolvedValueOnce(first)
      if (second) maybeSingle.mockResolvedValueOnce(second)
      const eq = vi.fn(() => ({ maybeSingle }))
      const select = vi.fn(() => ({ eq }))
      return { c: { from: vi.fn(() => ({ select })) } as never, select, maybeSingle }
    }
    const missing = { data: null, error: { code: '42703', message: 'column card_profiles.film_src does not exist' } }

    it('still serves the published card, with no film, when the column does not exist yet', async () => {
      const m = twoStep(missing, { data: oldRow, error: null })
      const card = await getPublishedCard('sam', m.c)
      expect(card).toMatchObject({ slug: 'sam', displayName: 'Sam', filmSrc: null })
      expect(m.select).toHaveBeenCalledTimes(2)
      expect(m.select.mock.calls[1]![0]).not.toContain('film_src')
      expect(m.select.mock.calls[1]![0]).toContain('published_at')
    })

    it('still hides a draft or unknown card on the fallback read', async () => {
      expect(await getPublishedCard('sam', twoStep(missing, { data: { ...oldRow, published_at: null }, error: null }).c)).toBeNull()
      expect(await getPublishedCard('sam', twoStep(missing, { data: null, error: null }).c)).toBeNull()
    })

    it('retries once, and a failure of the fallback read still throws', async () => {
      const m = twoStep(missing, { data: null, error: { message: 'db down' } })
      await expect(getPublishedCard('sam', m.c)).rejects.toThrow('card read failed: db down')
      expect(m.select).toHaveBeenCalledTimes(2)
    })

    it('any other failed read throws at once, with no fallback', async () => {
      for (const error of [
        { message: 'permission denied for table card_profiles', code: '42501' },
        { message: 'column card_profiles.role_title does not exist', code: '42703' },
        { message: 'db down' },
      ]) {
        const m = twoStep({ data: null, error })
        await expect(getPublishedCard('sam', m.c)).rejects.toThrow('card read failed')
        expect(m.select).toHaveBeenCalledTimes(1)
      }
    })
  })
})
