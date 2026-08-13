import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildRuntimeControlPlane } from './runtime-control-plane'
import { normalizeSwarmRuntime } from './swarm-foundation'
import { createOrUpdateToolArtifact } from './tool-artifacts-store'

function runtime(input: Record<string, unknown>) {
  return {
    ...normalizeSwarmRuntime('swarm5', input, { workspaceRoot: '/tmp' }),
    ...input,
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function persistedReceipt(input: { taskId: string; workerId: string }) {
  const content = JSON.stringify({
    version: 1,
    taskId: input.taskId,
    workerId: input.workerId,
    source: 'test-runner',
  })
  const artifact = createOrUpdateToolArtifact({
    sessionId: `control-plane-${input.workerId}`,
    toolName: 'test-runner',
    title: 'control-plane test receipt',
    content,
  })
  return {
    artifactId: artifact.id,
    sha256: sha256(content),
    source: 'workspace-tool-artifact' as const,
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

  it('does not treat a free-text result as an artefact receipt', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Build the control plane',
            checkpointStatus: 'done',
            state: 'idle',
            lastResult: 'Everything passed.',
            nextAction: 'Run independent review',
          }),
        },
      ],
      now: 100,
    })

    expect(result.tasks[0]).toMatchObject({
      evidenceStatus: 'missing',
      handoff: { eligible: false },
    })
  })

  it('makes evidenced completion eligible for a reviewer handoff', () => {
    const receipt = persistedReceipt({ taskId: 'swarm5:current', workerId: 'swarm5' })
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
            artifacts: [{ id: receipt.artifactId, kind: 'report', label: 'focused test receipt', workerId: 'swarm5', source: 'workspace', receipt }],
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

  it('expires a stale active Hermes checkpoint instead of reporting it active', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Verify preview',
            state: 'executing',
            checkpointStatus: 'in_progress',
            lastOutputAt: 0,
          }),
        },
      ],
      now: 10 * 60 * 1000 + 1,
    })

    expect(result.runtimes.find((entry) => entry.id === 'hermes')).toMatchObject({
      state: 'stale',
      detail: expect.stringMatching(/stale/i),
    })
    expect(result.tasks[0]).toMatchObject({
      state: 'unknown',
      blocker: expect.stringMatching(/stale/i),
    })
    expect(result.summary.active).toBe(0)
  })

  it('does not count unreadable or missing Hermes files as observed', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          source: 'fallback',
          runtime: runtime({ currentTask: 'Old fallback task' }),
        },
      ],
      now: 100,
    })

    expect(result.runtimes.find((entry) => entry.id === 'hermes')).toMatchObject({
      state: 'not_reporting',
    })
    expect(result.tasks).toHaveLength(0)
  })

  it('projects a fresh Codex receipt and never treats it as dispatch authority', () => {
    const receipt = persistedReceipt({ taskId: 'codex:command-centre-proof', workerId: 'codex' })
    const result = buildRuntimeControlPlane({
      workerIds: [],
      runtimes: [],
      now: 100,
      codexCheckpoint: {
        detail: 'Codex checkpoint observed.',
        checkpoint: {
          version: 1,
          publisher: 'codex',
          observedAt: 99,
          task: {
            id: 'command-centre-proof',
            title: 'Capture authenticated canvas proof',
            state: 'complete',
            deadlineAt: null,
            evidence: [{ label: 'Playwright receipt', kind: 'report', ...receipt }],
            blocker: null,
            nextAction: 'Run independent review',
            receipt: 'authenticated preview receipt',
          },
        },
      },
    })

    expect(result.runtimes.find((entry) => entry.id === 'codex')).toMatchObject({ state: 'observed' })
    expect(result.tasks[0]).toMatchObject({
      runtime: 'codex', evidenceStatus: 'present', handoff: { eligible: true, target: 'reviewer' },
    })
    expect(result.execution).toBe('disabled')
  })

  it('requires a Codex artefact rather than a free-text receipt for handoff', () => {
    const result = buildRuntimeControlPlane({
      workerIds: [],
      runtimes: [],
      now: 100,
      codexCheckpoint: {
        detail: 'Codex checkpoint observed.',
        checkpoint: {
          version: 1,
          publisher: 'codex',
          observedAt: 99,
          task: {
            id: 'command-centre-proof',
            title: 'Capture authenticated canvas proof',
            state: 'complete',
            deadlineAt: null,
            evidence: [],
            blocker: null,
            nextAction: 'Run independent review',
            receipt: 'A claimed receipt is not an artefact.',
          },
        },
      },
    })

    expect(result.tasks[0]).toMatchObject({
      evidenceStatus: 'missing',
      handoff: { eligible: false },
    })
  })

  it('does not trust artifact metadata unless its persisted receipt binds the task and checksum', () => {
    const result = buildRuntimeControlPlane({
      workerIds: ['swarm5'],
      runtimes: [
        {
          workerId: 'swarm5',
          runtime: runtime({
            currentTask: 'Build the control plane',
            checkpointStatus: 'done',
            state: 'idle',
            nextAction: 'Run independent review',
            artifacts: [{
              id: 'toolout_0000000000000000',
              kind: 'report',
              label: 'fabricated receipt',
              workerId: 'swarm5',
              source: 'workspace',
              receipt: {
                artifactId: 'toolout_0000000000000000',
                sha256: '0'.repeat(64),
                source: 'workspace-tool-artifact',
              },
            }],
          }),
        },
      ],
      now: 100,
    })

    expect(result.tasks[0]).toMatchObject({
      evidenceStatus: 'missing',
      handoff: { eligible: false },
    })
  })
})
