import { describe, expect, it } from 'vitest'
import { createRunQueueStore } from '../run-queue'
import type { FounderContextPack, FounderTaskPacket, MachineAssignment } from '../types'

const taskPacket: FounderTaskPacket = {
  id: 'task-queue-1',
  originalMessage: 'Build the Pi run queue.',
  taskType: 'code_change',
  lane: 'feature_build',
  portfolioTarget: 'unite_hub',
  riskLevel: 'medium',
  objective: 'Build the Pi run queue.',
  requiredAgents: ['project-manager', 'senior-fullstack', 'qa-tester'],
  doneCriteria: ['Implementation is tested'],
  contextPackId: 'ctx-queue-1',
  requiresLocalExecution: true,
}

const contextPack: FounderContextPack = {
  id: 'ctx-queue-1',
  taskId: 'task-queue-1',
  portfolioTarget: 'unite_hub',
  originalMessage: 'Build the Pi run queue.',
  durableSummary: 'unite_hub/feature_build: Build the Pi run queue.',
  constraints: ['Preserve context in Unite-Hub, not a local chat window.'],
  decisions: ['Execution lane classified as feature_build.'],
  evidenceLinks: [],
  blockers: [],
  nextRecommendedAction: 'Assign a scoped implementation lane with tests and evidence.',
  modelHistory: [],
  receiptIds: [],
  updatedAt: '2026-06-02T00:00:00.000Z',
}

const machineAssignment: MachineAssignment = {
  taskId: 'task-queue-1',
  assignedDeviceId: 'windows-desktop',
  assignedDeviceName: 'Windows Desktop PC',
  assignedRole: 'heavy_worker',
  status: 'assigned',
  reasons: ['Windows Desktop PC is assigned as heavy_worker.'],
  fallbackRoles: ['heavy_worker', 'always_on_host'],
}

describe('createRunQueueStore', () => {
  it('enqueues routed task packets with durable status metadata', () => {
    const store = createRunQueueStore()

    const item = store.enqueue({ taskPacket, contextPack, machineAssignment, now: '2026-06-02T00:00:00.000Z' })

    expect(item.id).toBe('run_task-queue-1')
    expect(item.status).toBe('queued')
    expect(item.taskPacket).toBe(taskPacket)
    expect(item.contextPack).toBe(contextPack)
    expect(item.machineAssignment).toBe(machineAssignment)
    expect(item.createdAt).toBe('2026-06-02T00:00:00.000Z')
    expect(store.list()).toHaveLength(1)
  })

  it('marks approval-required tasks as waiting_for_approval', () => {
    const store = createRunQueueStore()
    const approvalTask: FounderTaskPacket = { ...taskPacket, riskLevel: 'high', requiresHumanApproval: true }

    const item = store.enqueue({ taskPacket: approvalTask, contextPack, machineAssignment, now: '2026-06-02T00:00:00.000Z' })

    expect(item.status).toBe('waiting_for_approval')
  })

  it('deduplicates repeated route submissions by task id', () => {
    const store = createRunQueueStore()

    const first = store.enqueue({ taskPacket, contextPack, machineAssignment, now: '2026-06-02T00:00:00.000Z' })
    const second = store.enqueue({ taskPacket, contextPack, machineAssignment, now: '2026-06-02T00:01:00.000Z' })

    expect(second.id).toBe(first.id)
    expect(second.updatedAt).toBe('2026-06-02T00:01:00.000Z')
    expect(store.list()).toHaveLength(1)
  })

  it('approves a waiting task and records the approval receipt', () => {
    const store = createRunQueueStore()
    const approvalTask: FounderTaskPacket = { ...taskPacket, riskLevel: 'high', requiresHumanApproval: true }
    const queued = store.enqueue({ taskPacket: approvalTask, contextPack, machineAssignment, now: '2026-06-02T00:00:00.000Z' })

    const approved = store.transition({ id: queued.id, action: 'approve', actor: 'Margot', note: 'Approved for scoped implementation.', now: '2026-06-02T00:02:00.000Z' })

    expect(approved.status).toBe('queued')
    expect(approved.approvals).toEqual([{ actor: 'Margot', note: 'Approved for scoped implementation.', at: '2026-06-02T00:02:00.000Z' }])
    expect(approved.receipts.at(-1)?.type).toBe('approval')
  })

  it('starts, blocks, and completes work with evidence receipts', () => {
    const store = createRunQueueStore()
    const queued = store.enqueue({ taskPacket, contextPack, machineAssignment, now: '2026-06-02T00:00:00.000Z' })

    const started = store.transition({ id: queued.id, action: 'start', actor: 'Pi-Dev-Ops', now: '2026-06-02T00:03:00.000Z' })
    const blocked = store.transition({ id: queued.id, action: 'block', actor: 'Pi-Dev-Ops', note: 'Needs credential grant.', now: '2026-06-02T00:04:00.000Z' })
    const completed = store.transition({ id: queued.id, action: 'complete', actor: 'Pi-Dev-Ops', evidenceLink: 'vitest:19-pass', note: 'Looped tests passed.', now: '2026-06-02T00:05:00.000Z' })

    expect(started.status).toBe('in_progress')
    expect(blocked.status).toBe('blocked')
    expect(blocked.blockers).toContain('Needs credential grant.')
    expect(completed.status).toBe('completed')
    expect(completed.contextPack.evidenceLinks).toContain('vitest:19-pass')
    expect(completed.receipts.map((receipt) => receipt.type)).toEqual(['start', 'blocker', 'completion'])
  })

  it('throws when completing without evidence', () => {
    const store = createRunQueueStore()
    const queued = store.enqueue({ taskPacket, contextPack, machineAssignment })

    expect(() => store.transition({ id: queued.id, action: 'complete', actor: 'Pi-Dev-Ops' })).toThrow('completion requires evidenceLink')
  })
})
