// src/lib/command-centre/__tests__/merge-task-metadata.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mergeTaskMetadata } from '../tasks'

function clientReturning(existing: unknown, updated: unknown) {
  const single = vi.fn().mockResolvedValueOnce({ data: existing, error: null }) // getTaskById read
                       .mockResolvedValueOnce({ data: updated, error: null })  // update write
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain); chain.select = vi.fn(() => chain)
  chain.update = vi.fn(() => chain); chain.eq = vi.fn(() => chain); chain.single = single
  return { chain, single }
}

describe('mergeTaskMetadata', () => {
  it('shallow-merges patch into existing metadata and returns the row', async () => {
    const existing = { id: 't1', founder_id: 'u1', metadata: { a: 1 } }
    const updated = { id: 't1', founder_id: 'u1', metadata: { a: 1, b: 2 } }
    const { chain } = clientReturning(existing, updated)
    const res = await mergeTaskMetadata({ founderId: 'u1', taskId: 't1', patch: { b: 2 } }, chain as never)
    expect(res?.metadata).toEqual({ a: 1, b: 2 })
    expect((chain.update as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ metadata: { a: 1, b: 2 } })
  })

  it('returns null when the task does not exist', async () => {
    const { chain } = clientReturning(null, null)
    const res = await mergeTaskMetadata({ founderId: 'u1', taskId: 'missing', patch: { b: 2 } }, chain as never)
    expect(res).toBeNull()
  })
})
