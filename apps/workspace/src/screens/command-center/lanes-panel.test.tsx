import { describe, expect, it } from 'vitest'
import {
  buildLaneCreateInput,
  buildQueuedTaskInput,
  formatBackendOptionLabel,
  formatWorkerStatus,
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
