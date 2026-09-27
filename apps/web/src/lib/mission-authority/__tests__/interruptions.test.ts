import { describe, expect, it, vi } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import type { SupabaseLike, TaskEvent } from '@/lib/command-centre/tasks'
import { interruptionMetric, loadInterruptionLedger, recordInterruption, type InterruptionReadClient } from '../interruptions'

// UNI-2779 — every founder interruption is recorded with its class, and the
// metric relates them to VERIFIED outcomes without inventing a rate.

function insertClient() {
  const insert = vi.fn((row: Record<string, unknown>) => ({
    select: () => ({ single: async () => ({ data: { id: 'event-1', at: '2026-09-27T00:00:00.000Z', ...row }, error: null }) }),
  }))
  return { client: { from: () => ({ insert }) } as unknown as SupabaseLike, insert }
}

const event = (id: string, payload: Record<string, unknown>, type: TaskEvent['type'] = 'comment') => ({
  id, task_id: 'task-1', type, payload, at: '2026-09-27T00:00:00.000Z',
})
const interruption = (id: string, cls: string) => event(id, { kind: 'interruption', class: cls, source: 'runner', reason: 'why' })
const verifiedContinuation = { mission: {
  mission_id: 'task-2', intent_hash: 'b'.repeat(64), authority_version: policy.schema, phase: 'VERIFIED', status: 'complete',
  candidate_sha: null, last_verified_sha: null, next_action: 'update_linear', blocked_reason: null, attempt_count: 0, receipts: [],
  updated_at: '2026-09-27T00:00:00.000Z',
} }

describe('recordInterruption', () => {
  it('appends a comment event carrying exactly the agreed payload', async () => {
    const { client, insert } = insertClient()
    await recordInterruption({ founderId: 'founder-1', taskId: 'task-1', class: 'LEGITIMATE_PROTECTED_BOUNDARY', source: 'runner-release', reason: 'promote_production' }, client)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      founder_id: 'founder-1', task_id: 'task-1', type: 'comment',
      payload: { kind: 'interruption', class: 'LEGITIMATE_PROTECTED_BOUNDARY', source: 'runner-release', reason: 'promote_production' },
    }))
  })

  it('records an unknown class as OTHER and keeps the original class in the reason', async () => {
    const { client, insert } = insertClient()
    await recordInterruption({ founderId: 'founder-1', taskId: 'task-1', class: 'FELT_LIKE_ASKING', source: 'runner', reason: 'unsure' }, client)
    const payload = (insert.mock.calls[0][0] as { payload: Record<string, string> }).payload
    expect(payload.class).toBe('OTHER')
    expect(payload.reason).toContain('FELT_LIKE_ASKING')
    expect(payload.reason).toContain('unsure')
  })
})

describe('interruptionMetric', () => {
  it('counts by every policy class and divides by verified outcomes', () => {
    const metric = interruptionMetric(
      [interruption('1', 'LEGITIMATE_PROTECTED_BOUNDARY'), interruption('2', 'BROKEN_TOOL'), interruption('3', 'BROKEN_TOOL'),
        event('4', { kind: 'note' }), event('5', { kind: 'interruption', class: 'BROKEN_TOOL' }, 'blocked')],
      [{ status: 'done', metadata: {} }, { status: 'running', metadata: verifiedContinuation }, { status: 'running', metadata: {} }],
    )
    expect(Object.keys(metric.byClass).sort()).toEqual(Object.keys(policy.interruption_classes).sort())
    expect(metric.byClass.LEGITIMATE_PROTECTED_BOUNDARY).toBe(1)
    expect(metric.byClass.BROKEN_TOOL).toBe(2)
    expect(metric.total).toBe(3)
    expect(metric.verifiedOutcomes).toBe(2)
    expect(metric.perVerifiedOutcome).toBe(1.5)
  })

  it('reports the count with a null rate when there is no verified outcome — never 0, Infinity or NaN', () => {
    const metric = interruptionMetric([interruption('1', 'MODEL_UNCERTAINTY'), interruption('2', 'MODEL_UNCERTAINTY')], [{ status: 'running', metadata: {} }])
    expect(metric.total).toBe(2)
    expect(metric.verifiedOutcomes).toBe(0)
    expect(metric.perVerifiedOutcome).toBeNull()
  })

  it('reads a stored class the policy no longer names as OTHER', () => {
    expect(interruptionMetric([interruption('1', 'RETIRED_CLASS')], []).byClass.OTHER).toBe(1)
  })
})

describe('loadInterruptionLedger', () => {
  it('throws on a failed read rather than reporting an empty ledger', async () => {
    const failed = { data: null, error: { message: 'boom' } }
    const chain = { eq: () => chain, order: () => chain, limit: async () => failed }
    const client = { from: () => ({ select: () => chain }) } as unknown as InterruptionReadClient
    await expect(loadInterruptionLedger('founder-1', client)).rejects.toThrow('boom')
  })
})
