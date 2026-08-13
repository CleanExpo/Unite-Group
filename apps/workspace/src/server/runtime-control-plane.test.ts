import { describe, expect, it } from 'vitest'
import { buildRuntimeControlPlane } from './runtime-control-plane'
import { normalizeSwarmRuntime } from './swarm-foundation'

function runtime(input: Record<string, unknown>) {
  return {
    ...normalizeSwarmRuntime('swarm5', input, { workspaceRoot: '/tmp' }),
    ...input,
  }
}

describe('runtime control plane', () => {
  it('marks completion without evidence as ineligible for handoff', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Build the control plane',
            checkpointStatus: 'done',
            state: 'idle',
            nextAction: 'Review the change',
          }),
        },
      ],
      now: 100,
    })

    expect(result.tasks[0]).toMatchObject({
      state: 'complete',
      evidenceStatus: 'missing',
      handoff: { eligible: false, reason: 'Completion has no runtime evidence.' },
    })
    expect(result.summary.eligibleHandoffs).toBe(0)
  })

  it('makes evidenced completion eligible for a reviewer handoff', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Build the control plane',
            checkpointStatus: 'done',
            state: 'idle',
            lastResult: 'Focused tests passed.',
            nextAction: 'Run independent review',
            artifacts: [{ id: 'test', kind: 'report', label: 'focused test receipt', workerId: 'swarm5', source: 'runtime' }],
          }),
        },
      ],
      now: 100,
      hermesReportsLocalGemma: true,
    })

    expect(result.tasks[0]).toMatchObject({
      evidenceStatus: 'present',
      handoff: { eligible: true, target: 'reviewer' },
    })
    expect(result.runtimes.find((entry) => entry.id === 'ollama')?.state).toBe('observed')
  })

  it('shows overdue work and blockers without inventing a handoff', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Verify preview',
            state: 'blocked',
            checkpointStatus: 'blocked',
            blockedReason: 'Vercel authentication is required.',
            deadlineAt: 99,
          }),
        },
      ],
      now: 100,
    })

    expect(result.tasks[0]).toMatchObject({
      state: 'blocked',
      deadlineStatus: 'overdue',
      handoff: { eligible: false },
    })
    expect(result.summary).toMatchObject({ blocked: 1, overdue: 1 })
  })
})
