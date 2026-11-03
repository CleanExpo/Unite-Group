import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { persistChannelBotRun } from '../persist'
import { BUSINESS_TO_TEAM } from '@/lib/integrations/linear'

function fakeDb(insertResult: unknown, readResult: unknown) {
  const inserted: unknown[] = []
  const readFilters: Array<[string, unknown]> = []
  const chain = {
    eq: (col: string, val: unknown) => { readFilters.push([col, val]); return chain },
    single: async () => readResult,
  }
  const db = {
    from: vi.fn(() => ({
      insert: (row: unknown) => { inserted.push(row); return { select: () => ({ single: async () => insertResult }) } },
      select: () => chain,
    })),
  }
  return { db: db as unknown as SupabaseClient, inserted, readFilters }
}

const out = { results: [{ bot: 'youtube' as const, status: 'ok' as const, actions: [] }], ready: [{ bot: 'youtube' as const, kind: 'report' as const, summary: 'YouTube: 5 subs' }], heldForApproval: [], allFailed: false, anyFailed: false }

describe('persistChannelBotRun', () => {
  it('writes a CRM insight and confirms it', async () => {
    const { db, inserted } = fakeDb({ data: { id: 'i1' }, error: null }, { data: { id: 'i1' }, error: null })
    expect(await persistChannelBotRun(db, 'f', out)).toBe('i1')
    expect(JSON.stringify(inserted[0])).toContain('YouTube: 5 subs')
    // The CRM create-issue action needs a Linear team for this business key.
    expect(BUSINESS_TO_TEAM[(inserted[0] as { business_key: string }).business_key]).toBe('UNI')
  })
  it('scopes the confirmation read-back to the founder as well as the row id', async () => {
    const { db, readFilters } = fakeDb({ data: { id: 'i1' }, error: null }, { data: { id: 'i1' }, error: null })
    await persistChannelBotRun(db, 'founder-9', out)
    expect(readFilters).toEqual(expect.arrayContaining([['id', 'i1'], ['founder_id', 'founder-9']]))
  })
  it('marks a partly failing run high priority', async () => {
    const { db, inserted } = fakeDb({ data: { id: 'i1' }, error: null }, { data: { id: 'i1' }, error: null })
    await persistChannelBotRun(db, 'f', { ...out, anyFailed: true, results: [...out.results, { bot: 'search-console', status: 'error', actions: [], error: 'Search Console API 403' }] })
    const row = inserted[0] as { priority: string; title: string; body: string }
    expect(row.priority).toBe('high')
    expect(row.title).toContain('some bots failing')
    expect(row.body).toContain('Search Console API 403')
  })
  it('throws when the write is not confirmed', async () => {
    const { db } = fakeDb({ data: { id: 'i1' }, error: null }, { data: null, error: { message: 'x' } })
    await expect(persistChannelBotRun(db, 'f', out)).rejects.toThrow('not confirmed')
  })
  it('throws when the insert fails', async () => {
    const { db } = fakeDb({ data: null, error: { message: 'denied' } }, null)
    await expect(persistChannelBotRun(db, 'f', out)).rejects.toThrow('denied')
  })
})
