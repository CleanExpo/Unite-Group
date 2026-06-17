import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { listFounderRunQueueItems, saveFounderRunQueueItem } from '../run-queue-persistence'
import { makeFakeRunQueueDb } from './fake-run-queue-db'
import type { FounderRunQueueItem } from '../types'

function makeItem(id: string, founderUpdated = '2026-06-02T00:00:00.000Z'): FounderRunQueueItem {
  return {
    id,
    status: 'queued',
    taskPacket: { id: id.replace('run_', '') } as never,
    contextPack: {} as never,
    machineAssignment: {} as never,
    approvals: [],
    blockers: [],
    receipts: [],
    createdAt: founderUpdated,
    updatedAt: founderUpdated,
  }
}

let db: ReturnType<typeof makeFakeRunQueueDb>

beforeEach(() => {
  db = makeFakeRunQueueDb()
  vi.mocked(createClient).mockResolvedValue(db.client as never)
})

describe('pi_run_queue persistence adapter', () => {
  it('saves an item scoped to the founder and reads it back', async () => {
    await saveFounderRunQueueItem('founder-1', makeItem('run_a'))

    expect(db.rows).toHaveLength(1)
    expect(db.rows[0].founder_id).toBe('founder-1')
    expect(db.rows[0].queue_id).toBe('run_a')

    const items = await listFounderRunQueueItems('founder-1')
    expect(items.map((i) => i.id)).toEqual(['run_a'])
  })

  it('upserts (does not duplicate) the same queue_id for the same founder', async () => {
    await saveFounderRunQueueItem('founder-1', makeItem('run_a', '2026-06-02T00:00:00.000Z'))
    await saveFounderRunQueueItem('founder-1', { ...makeItem('run_a', '2026-06-02T01:00:00.000Z'), status: 'blocked' })

    expect(db.rows).toHaveLength(1)
    expect(db.rows[0].status).toBe('blocked')
  })

  it('never returns another founder\'s items', async () => {
    await saveFounderRunQueueItem('founder-1', makeItem('run_a'))
    await saveFounderRunQueueItem('founder-2', makeItem('run_b'))

    expect((await listFounderRunQueueItems('founder-1')).map((i) => i.id)).toEqual(['run_a'])
    expect((await listFounderRunQueueItems('founder-2')).map((i) => i.id)).toEqual(['run_b'])
  })

  it('throws (does not silently empty) when the list query errors', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(r) }) }) }),
      }),
    } as never)

    await expect(listFounderRunQueueItems('founder-1')).rejects.toThrow(/pi_run_queue list failed: boom/)
  })
})
