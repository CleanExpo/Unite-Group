import { describe, expect, it } from 'vitest'
import {
  buildLaneCreateInput,
  buildQueuedTaskInput,
  formatBackendOptionLabel,
  formatWorkerStatus,
  selectLaneRunView,
} from './lanes-panel'

const gatewayDescriptor = {
  id: 'gateway:minimax:minimax%2Fabab6.5',
  kind: 'gateway' as const,
  label: 'minimax / minimax/abab6.5',
  available: true,
  backend: {
    kind: 'gateway' as const,
    provider: 'minimax',
    model: 'minimax/abab6.5',
  },
}

describe('buildLaneCreateInput', () => {
  it('displays the server-provided backend unavailability reason', () => {
    expect(
      formatBackendOptionLabel({
        ...gatewayDescriptor,
        available: false,
        unavailableReason:
          'execution unavailable — kernel containment required',
      }),
    ).toBe(
      'minimax / minimax/abab6.5 (execution unavailable — kernel containment required)',
    )
  })

  it('submits the exact gateway model selected from the catalogue', () => {
    expect(
      buildLaneCreateInput(gatewayDescriptor, 'builder', '  /repo  '),
    ).toEqual({
      kind: 'gateway',
      backend: {
        kind: 'gateway',
        provider: 'minimax',
        model: 'minimax/abab6.5',
      },
      role: 'builder',
      repo: '/repo',
    })
  })

  it('rejects a blank repository path', () => {
    expect(buildLaneCreateInput(gatewayDescriptor, 'builder', '   ')).toBeNull()
  })

  it('labels unverified remote workers without implying connectivity', () => {
    expect(
      formatWorkerStatus({
        id: 'mac-mini-tailscale',
        label: 'Mac Mini over Tailscale',
        transport: 'tailscale',
        machineId: 'unverified-mac-mini',
        machineStatus: 'unverified',
        enabled: false,
        reason: 'Interface only — remote identity is not verified',
      }),
    ).toBe('unverified · Interface only — remote identity is not verified')
  })

  it('requires explicit approval before producing a queue request', () => {
    expect(
      buildQueuedTaskInput('lane-1', ' bounded work ', false, 'idem-task-0001'),
    ).toBeNull()
    expect(
      buildQueuedTaskInput('lane-1', ' bounded work ', true, null),
    ).toBeNull()
    expect(
      buildQueuedTaskInput('lane-1', ' bounded work ', true, 'idem-task-0001'),
    ).toEqual({
      id: 'lane-1',
      mission: 'bounded work',
      approved: true,
      idempotencyKey: 'idem-task-0001',
    })
  })
})

describe('selectLaneRunView', () => {
  const lane = {
    id: 'lane-1',
    kind: 'cli' as const,
    backend: { kind: 'cli' as const, tool: 'claude-code' as const, account: 'max-1' },
    role: 'builder',
    repo: '/repo',
    branch: 'lane/lane-1',
    status: 'idle',
  }

  it('streams the run once the lane has one', () => {
    // Without this, the stream component never mounts and the whole UNI-2406
    // chain is invisible — green tests, dead feature.
    expect(selectLaneRunView({ ...lane, lastRunId: 'run_1' })).toEqual({
      mode: 'stream',
      runId: 'run_1',
    })
  })

  it('prefers the live stream over the stale final output', () => {
    expect(
      selectLaneRunView({ ...lane, lastRunId: 'run_1', lastOutput: 'old text' }),
    ).toEqual({ mode: 'stream', runId: 'run_1' })
  })

  it('keeps the final-only view for a lane whose run predates the stream', () => {
    // Dropping this branch would blank the visible history of every lane that
    // already exists — a regression dressed as a feature.
    expect(selectLaneRunView({ ...lane, lastOutput: 'legacy output' })).toEqual({
      mode: 'final',
      output: 'legacy output',
    })
  })

  it('shows nothing for a lane that has never run', () => {
    expect(selectLaneRunView(lane)).toEqual({ mode: 'none' })
  })
})
