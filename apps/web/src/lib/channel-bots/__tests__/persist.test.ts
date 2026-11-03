import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { persistChannelBotRun } from '../persist'

function fakeDb(insertResult: unknown, readResult: unknown) {
  const inserted: unknown[] = []
  const db = {
    from: vi.fn(() => ({
      insert: (row: unknown) => { inserted.push(row); return { select: () => ({ single: async () => insertResult }) } },
      select: () => ({ eq: () => ({ single: async () => readResult }) }),
    })),
  }
  return { db: db as unknown as SupabaseClient, inserted }
}

const out = { results: [{ bot: 'youtube' as const, status: 'ok' as const, actions: [] }], ready: [{ bot: 'youtube' as const, kind: 'report' as const, summary: 'YouTube: 5 subs' }], heldForApproval: [], allFailed: false }

describe('persistChannelBotRun', () => {
  it('writes a CRM insight and confirms it', async () => {
    const { db, inserted } = fakeDb({ data: { id: 'i1' }, error: null }, { data: { id: 'i1' }, error: null })
    expect(await persistChannelBotRun(db, 'f', out)).toBe('i1')
    expect(JSON.stringify(inserted[0])).toContain('YouTube: 5 subs')
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
