import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { readEntitlements, type EntitlementsReadClient } from '../get-entitlements'
import { noEntitlements, normaliseEntitlements, PORTAL_MODULES } from '../types'

const ALL_ON = { content: true, seo: true, social: true, voice: true }

function client(data: { plan: unknown; modules: unknown } | null, error: { message: string } | null = null) {
  const eq = vi.fn(() => ({ maybeSingle: async () => ({ data, error }) }))
  const select = vi.fn(() => ({ eq }))
  return { client: { from: vi.fn(() => ({ select })) } as unknown as EntitlementsReadClient, eq, select }
}

describe('entitlements', () => {
  it('comp reads every paid module as OFF, even if a row says ON', () => {
    const e = normaliseEntitlements({ plan: 'comp', modules: ALL_ON })
    expect(e.plan).toBe('comp')
    for (const m of PORTAL_MODULES) expect(e.modules[m]).toBe(false)
  })

  it('none reads every module as OFF', () => {
    expect(normaliseEntitlements({ plan: 'none', modules: ALL_ON }).modules).toEqual(noEntitlements().modules)
  })

  it('paid reads exactly the modules stored as true', () => {
    expect(normaliseEntitlements({ plan: 'paid', modules: { seo: true, voice: 'yes', content: 1 } }).modules)
      .toEqual({ content: false, seo: true, social: false, voice: false })
  })

  it('an unknown plan is an error, never a silent "none"', () => {
    expect(() => normaliseEntitlements({ plan: 'enterprise', modules: {} })).toThrow(/unknown plan/)
  })

  it('reads one tenant on the caller session, and no row means plan none with everything OFF', async () => {
    const c = client(null)
    expect(await readEntitlements(c.client, 'brii')).toEqual({ plan: 'none', modules: { content: false, seo: false, social: false, voice: false } })
    expect(c.select).toHaveBeenCalledWith('plan, modules')
    expect(c.eq).toHaveBeenCalledWith('tenant_slug', 'brii')
  })

  it('a failed read throws, never an empty answer', async () => {
    await expect(readEntitlements(client(null, { message: 'permission denied' }).client, 'brii')).rejects.toThrow(/read failed/)
  })
})
