import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mutable test state, hoisted so the vi.mock factories below can read it.
const h = vi.hoisted(() => ({
  configured: true,
  vaultRows: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/cache', () => ({
  getCached: () => null,
  setCache: () => {},
}))

vi.mock('../google-oauth', () => ({
  isGoogleConfigured: () => h.configured,
  getValidToken: vi.fn(async () => 'access-token'),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    // Thenable query builder: from/select/eq chain resolves to { data: vaultRows }.
    const b: Record<string, unknown> = {}
    b.from = () => b
    b.select = () => b
    b.eq = () => b
    b.then = (resolve: (v: { data: unknown }) => unknown) => resolve({ data: h.vaultRows })
    return b
  },
}))

vi.mock('@/lib/vault', () => ({
  decrypt: () => JSON.stringify({ access_token: 'a', refresh_token: 'r', expiry: 0 }),
}))

import { fetchCalendarEvents } from '../calendar'

const ROW = { encrypted_value: 'e', iv: 'i', salt: 's', notes: 'a@b.com', metadata: { businessKey: 'synthex' } }

function fetchOk(items: unknown[]) {
  return { ok: true, status: 200, json: async () => ({ items }) } as Response
}
function fetchFail(status = 500) {
  return { ok: false, status, json: async () => ({}) } as Response
}

beforeEach(() => {
  h.configured = true
  h.vaultRows = [{ ...ROW }]
})

describe('fetchCalendarEvents — honest source discriminator', () => {
  it('returns not_connected when Google is not configured', async () => {
    h.configured = false
    const res = await fetchCalendarEvents('founder-1')
    expect(res).toEqual({ data: [], source: 'not_connected' })
  })

  it('returns not_connected when no Google credentials are stored', async () => {
    h.vaultRows = []
    const res = await fetchCalendarEvents('founder-1')
    expect(res).toEqual({ data: [], source: 'not_connected' })
  })

  it('returns real events with source "google" on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fetchOk([{ id: 'ev1', summary: 'Standup', start: { dateTime: '2026-06-20T09:00:00Z' }, end: { dateTime: '2026-06-20T09:30:00Z' } }])
    )
    const res = await fetchCalendarEvents('founder-1')
    expect(res.source).toBe('google')
    expect(res.data).toHaveLength(1)
    expect(res.data[0].title).toBe('Standup')
  })

  it('returns source "error" (NOT an empty success) when every account fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(fetchFail(503))
    const res = await fetchCalendarEvents('founder-1')
    // The whole point: a failed load must NOT masquerade as "google + no events".
    expect(res.source).toBe('error')
    expect(res.data).toEqual([])
  })

  it('returns partial real data with source "google" when only some accounts fail', async () => {
    h.vaultRows = [{ ...ROW, notes: 'ok@b.com' }, { ...ROW, notes: 'bad@b.com' }]
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(fetchOk([{ id: 'ev1', summary: 'Real', start: { dateTime: '2026-06-20T09:00:00Z' }, end: { dateTime: '2026-06-20T10:00:00Z' } }]))
      .mockResolvedValueOnce(fetchFail(500))
    const res = await fetchCalendarEvents('founder-1')
    expect(res.source).toBe('google')
    expect(res.data).toHaveLength(1)
    expect(res.data[0].title).toBe('Real')
  })
})
