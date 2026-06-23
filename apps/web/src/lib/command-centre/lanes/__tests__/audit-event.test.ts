// src/lib/command-centre/lanes/__tests__/audit-event.test.ts
// Unit: appendAuditEventBestEffort — shared best-effort audit append.
import { describe, it, expect, vi } from 'vitest'
import { appendAuditEventBestEffort } from '../audit-event'

const INPUT = {
  founderId: 'founder-1',
  taskId: 'task-1',
  type: 'comment' as const,
  actor: 'system',
  payload: { kind: 'software_planned' },
}

describe('appendAuditEventBestEffort', () => {
  it('forwards the input and db client to the append fn', async () => {
    const append = vi.fn().mockResolvedValue({})
    const db = { from: vi.fn() }
    await appendAuditEventBestEffort(append as never, INPUT, db as never)
    expect(append).toHaveBeenCalledWith(INPUT, db)
  })

  it('passes undefined db through when none is given', async () => {
    const append = vi.fn().mockResolvedValue({})
    await appendAuditEventBestEffort(append as never, INPUT)
    expect(append).toHaveBeenCalledWith(INPUT, undefined)
  })

  it('swallows errors from the append fn (resolves, does not reject)', async () => {
    const append = vi.fn().mockRejectedValue(new Error('db error'))
    await expect(appendAuditEventBestEffort(append as never, INPUT)).resolves.toBeUndefined()
    expect(append).toHaveBeenCalledOnce()
  })
})
