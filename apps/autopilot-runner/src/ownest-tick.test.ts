import { describe, expect, it, vi } from 'vitest'
import { main } from './ownest-tick.js'
import type {
  OwnestConfig,
  OwnestCrmClient,
  OwnestHermesClient,
  OwnestTickSummary,
} from './ownest/types.js'

const SERVICE_KEY = 'service-role-secret-DO-NOT-LEAK'

function validEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    FOUNDER_USER_ID: 'founder-1',
    CC_OWNEST_WORKER_ID: 'ownest-worker-1',
    HERMES_CWD: '/tmp/hermes-workspace',
    CC_OWNEST_LIVE: '0',
    ...overrides,
  }
}

function summary(overrides: Partial<OwnestTickSummary> = {}): OwnestTickSummary {
  return {
    outcome: 'drained',
    reconciled: 0,
    dispatched: 0,
    ...overrides,
  }
}

function harness(result: OwnestTickSummary = summary()) {
  const lines: string[] = []
  const runTick = vi.fn(async (_config: OwnestConfig) => result)
  const crm = {} as OwnestCrmClient
  const hermes = {} as OwnestHermesClient

  return {
    lines,
    runTick,
    deps: {
      crm,
      hermes,
      runTick,
      now: () => new Date('2026-07-12T00:04:00.000Z'),
      randomUUID: () => '11111111-1111-4111-8111-111111111111',
      writeLine: (line: string) => lines.push(line),
    },
  }
}

describe('OWNEST bounded entrypoint', () => {
  it('fails closed on invalid configuration without invoking the tick', async () => {
    const fixture = harness()

    await expect(main({}, fixture.deps)).resolves.toBe(1)

    expect(fixture.runTick).not.toHaveBeenCalled()
    expect(fixture.lines).toHaveLength(1)
    expect(JSON.parse(fixture.lines[0] ?? '{}')).toEqual({
      schema: 'ownest.tick.summary.v1',
      outcome: 'config_error',
    })
  })

  it('keeps reconciliation active with live admission off', async () => {
    const fixture = harness(summary({ outcome: 'reconciled', reconciled: 1, taskId: 'task-1' }))

    await expect(main(validEnv(), fixture.deps)).resolves.toBe(0)

    expect(fixture.runTick).toHaveBeenCalledOnce()
    expect(fixture.runTick.mock.calls[0]?.[0]).toMatchObject({ live: false })
    expect(JSON.parse(fixture.lines[0] ?? '{}')).toMatchObject({
      schema: 'ownest.tick.summary.v1',
      outcome: 'reconciled',
      reconciled: 1,
      dispatched: 0,
      taskId: 'task-1',
    })
  })

  it('emits exactly one deterministic JSON summary line for a clean tick', async () => {
    const fixture = harness(summary({ outcome: 'dispatched', dispatched: 1, taskId: 'task-1' }))

    await expect(main(validEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: 'rollout-1',
      CC_OWNEST_CANARY_TASK_ID: 'task-1',
    }), fixture.deps)).resolves.toBe(0)

    expect(fixture.lines).toHaveLength(1)
    expect(fixture.lines[0]).toBe(JSON.stringify({
      schema: 'ownest.tick.summary.v1',
      outcome: 'dispatched',
      reconciled: 0,
      dispatched: 1,
      taskId: 'task-1',
    }))
  })

  it('returns failure for a failed tick and redacts the service key from its error', async () => {
    const fixture = harness(summary({
      outcome: 'failed',
      error: `upstream rejected ${SERVICE_KEY}`,
    }))

    await expect(main(validEnv(), fixture.deps)).resolves.toBe(1)

    expect(fixture.lines.join('\n')).not.toContain(SERVICE_KEY)
    expect(JSON.parse(fixture.lines[0] ?? '{}')).toMatchObject({
      schema: 'ownest.tick.summary.v1',
      outcome: 'failed',
    })
  })

  it('turns an unexpected rejection into one redacted fatal summary', async () => {
    const fixture = harness()
    fixture.runTick.mockRejectedValueOnce(new Error(`fatal ${SERVICE_KEY}`))

    await expect(main(validEnv(), fixture.deps)).resolves.toBe(1)

    expect(fixture.lines).toHaveLength(1)
    expect(fixture.lines[0]).not.toContain(SERVICE_KEY)
    expect(JSON.parse(fixture.lines[0] ?? '{}')).toMatchObject({
      schema: 'ownest.tick.summary.v1',
      outcome: 'fatal',
    })
  })

  it('still emits a fatal receipt when an untrusted rejection cannot be stringified', async () => {
    const fixture = harness()
    fixture.runTick.mockRejectedValueOnce({
      toString() {
        throw new Error('string conversion failed')
      },
    })

    await expect(main(validEnv(), fixture.deps)).resolves.toBe(1)

    expect(fixture.lines).toHaveLength(1)
    expect(JSON.parse(fixture.lines[0] ?? '{}')).toEqual({
      schema: 'ownest.tick.summary.v1',
      outcome: 'fatal',
      error: 'Unknown OWNEST failure',
    })
  })
})
