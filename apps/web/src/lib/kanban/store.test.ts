import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { moveTask } from './store'

type Res = { data: unknown; error: unknown }

/** Every builder method returns the chain; each await consumes the next queued result. */
function makeDb(results: Res[]) {
  const queue = [...results]
  const calls: { method: string; args: unknown[] }[] = []
  const chain: Record<string, unknown> = {}
  for (const m of ['from', 'select', 'eq', 'neq', 'order', 'update']) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args })
      return chain
    })
  }
  chain.then = (resolve: (v: Res) => unknown) =>
    resolve(queue.length ? queue.shift()! : { data: null, error: null })
  return { chain, calls }
}

describe('moveTask (UNI-3079)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when the founder-scoped update touched the card', async () => {
    const { chain, calls } = makeDb([
      { data: [{ position: 1 }], error: null },
      { data: [{ id: 'card-1' }], error: null },
    ])
    vi.mocked(createClient).mockResolvedValue({ from: chain.from } as never)
    await expect(moveTask('user-123', 'card-1', 'done', 0)).resolves.toBe(true)
    expect(calls).toContainEqual({ method: 'eq', args: ['founder_id', 'user-123'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'card-1'] })
  })

  it('returns false when no row matched (card missing or not the founder\'s)', async () => {
    const { chain } = makeDb([
      { data: [], error: null },
      { data: [], error: null },
    ])
    vi.mocked(createClient).mockResolvedValue({ from: chain.from } as never)
    await expect(moveTask('user-123', 'card-x', 'done', 0)).resolves.toBe(false)
  })

  it('throws when the update errors', async () => {
    const { chain } = makeDb([
      { data: [], error: null },
      { data: null, error: { message: 'boom' } },
    ])
    vi.mocked(createClient).mockResolvedValue({ from: chain.from } as never)
    await expect(moveTask('user-123', 'card-1', 'done', 0)).rejects.toThrow('kanban_task move: boom')
  })
})
