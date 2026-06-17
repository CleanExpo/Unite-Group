import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  // Token carries the row's encrypted_value tag so the fetch mock can tell
  // accounts apart deterministically (Promise.all runs them concurrently).
  getValidToken: vi.fn(async (t: { tag?: string }) => t.tag ?? 'access-token'),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const b: Record<string, unknown> = {}
    b.from = () => b
    b.select = () => b
    b.eq = () => b
    b.then = (resolve: (v: { data: unknown }) => unknown) => resolve({ data: h.vaultRows })
    return b
  },
}))

vi.mock('@/lib/vault', () => ({
  decrypt: ({ encryptedValue }: { encryptedValue: string }) =>
    JSON.stringify({ access_token: 'a', refresh_token: 'r', expiry: 0, tag: encryptedValue }),
}))

import { fetchGmailThreads } from '../gmail'

const ROW = { encrypted_value: 'e', iv: 'i', salt: 's', notes: 'a@b.com', metadata: { businessKey: 'synthex' } }

function listOk(ids: string[]) {
  return { ok: true, status: 200, json: async () => ({ threads: ids.map((id) => ({ id })) }) } as Response
}
function threadOk(id: string) {
  return { ok: true, status: 200, json: async () => ({ id, snippet: 's', messages: [{ payload: { headers: [{ name: 'Subject', value: 'Hi' }, { name: 'From', value: 'x@y.com' }, { name: 'Date', value: '2026-06-18T00:00:00Z' }] }, labelIds: ['UNREAD'] }] }) } as Response
}
function fail(status = 500) {
  return { ok: false, status, json: async () => ({}) } as Response
}
function authOf(init?: RequestInit): string {
  const h = (init?.headers ?? {}) as Record<string, string>
  return h.Authorization ?? ''
}

beforeEach(() => {
  h.configured = true
  h.vaultRows = [{ ...ROW }]
})

describe('fetchGmailThreads — honest source discriminator', () => {
  it('returns not_connected when Google is not configured', async () => {
    h.configured = false
    expect(await fetchGmailThreads('founder-1')).toEqual({ data: [], source: 'not_connected' })
  })

  it('returns not_connected when no Google credentials are stored', async () => {
    h.vaultRows = []
    expect(await fetchGmailThreads('founder-1')).toEqual({ data: [], source: 'not_connected' })
  })

  it('returns real threads with source "gmail" on success', async () => {
    global.fetch = vi.fn((url: string) =>
      Promise.resolve(url.includes('/threads/') ? threadOk('t1') : listOk(['t1'])),
    ) as never
    const res = await fetchGmailThreads('founder-1')
    expect(res.source).toBe('gmail')
    expect(res.data).toHaveLength(1)
    expect(res.data[0].subject).toBe('Hi')
  })

  it('returns source "error" (NOT empty success) when the threads.list fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve(fail(503))) as never
    const res = await fetchGmailThreads('founder-1')
    expect(res.source).toBe('error')
    expect(res.data).toEqual([])
  })

  it('returns partial real data with source "gmail" when only some accounts fail', async () => {
    h.vaultRows = [{ ...ROW, encrypted_value: 'good', notes: 'ok@b.com' }, { ...ROW, encrypted_value: 'bad', notes: 'bad@b.com' }]
    // Deterministic by account token (carried via decrypt tag) + URL.
    global.fetch = vi.fn((url: string, init?: RequestInit) => {
      if (authOf(init).includes('bad')) return Promise.resolve(fail(500))
      return Promise.resolve(url.includes('/threads/') ? threadOk('t1') : listOk(['t1']))
    }) as never
    const res = await fetchGmailThreads('founder-1')
    expect(res.source).toBe('gmail')
    expect(res.data).toHaveLength(1)
  })
})
