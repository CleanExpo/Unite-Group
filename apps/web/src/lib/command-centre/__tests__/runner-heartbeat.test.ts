import { describe, it, expect } from 'vitest'
import {
  classifyRunnerHeartbeatAge,
  runningSessionLabel,
  pickNewestRunnerHeartbeat,
  summariseRunnerHeartbeat,
  loadRunnerHeartbeat,
  RUNNER_CONNECTED_WITHIN_MS,
  RUNNER_STALE_WITHIN_MS,
} from '../runner-heartbeat'
import type { AgentEventsClientLike } from '../agent-events'

describe('classifyRunnerHeartbeatAge', () => {
  it('treats null as offline', () => {
    expect(classifyRunnerHeartbeatAge(null)).toBe('offline')
  })

  it('treats future timestamps as connected (clock skew)', () => {
    expect(classifyRunnerHeartbeatAge(-1_000)).toBe('connected')
  })

  it('is connected within the poll slack window', () => {
    expect(classifyRunnerHeartbeatAge(0)).toBe('connected')
    expect(classifyRunnerHeartbeatAge(RUNNER_CONNECTED_WITHIN_MS)).toBe('connected')
  })

  it('is stale between connected and offline windows', () => {
    expect(classifyRunnerHeartbeatAge(RUNNER_CONNECTED_WITHIN_MS + 1)).toBe('stale')
    expect(classifyRunnerHeartbeatAge(RUNNER_STALE_WITHIN_MS)).toBe('stale')
  })

  it('is offline beyond the stale window', () => {
    expect(classifyRunnerHeartbeatAge(RUNNER_STALE_WITHIN_MS + 1)).toBe('offline')
  })
})

describe('runningSessionLabel (H1)', () => {
  it('passes non-running statuses through unchanged', () => {
    expect(runningSessionLabel('paused', 'offline')).toBe('paused')
    expect(runningSessionLabel('done', 'connected')).toBe('done')
  })

  it('shows waiting/none-connected only when running and offline', () => {
    expect(runningSessionLabel('running', 'offline')).toBe(
      'waiting for runner — none connected',
    )
  })

  it('shows heartbeat-stale when running and stale', () => {
    expect(runningSessionLabel('running', 'stale')).toBe(
      'waiting for runner — heartbeat stale',
    )
  })

  it('shows raw running when a heartbeat is connected (no longer a hardcoded lie)', () => {
    expect(runningSessionLabel('running', 'connected')).toBe('running')
  })
})

describe('pickNewestRunnerHeartbeat / summariseRunnerHeartbeat', () => {
  const now = Date.parse('2026-08-07T03:00:00.000Z')

  it('ignores non-runner and non-heartbeat rows', () => {
    expect(
      pickNewestRunnerHeartbeat([
        { agent_name: 'fable', event_type: 'heartbeat', created_at: '2026-08-07T02:59:50.000Z' },
        { agent_name: 'nexus-runner', event_type: 'status', created_at: '2026-08-07T02:59:55.000Z' },
      ]),
    ).toBeNull()
  })

  it('picks the newest nexus-runner heartbeat', () => {
    const newest = pickNewestRunnerHeartbeat([
      { agent_name: 'nexus-runner', event_type: 'heartbeat', created_at: '2026-08-07T02:58:00.000Z' },
      { agent_name: 'nexus-runner', event_type: 'heartbeat', created_at: '2026-08-07T02:59:30.000Z' },
    ])
    expect(newest?.created_at).toBe('2026-08-07T02:59:30.000Z')
  })

  it('summarises a fresh heartbeat as connected', () => {
    const summary = summariseRunnerHeartbeat(
      [
        {
          agent_name: 'nexus-runner',
          event_type: 'heartbeat',
          created_at: '2026-08-07T02:59:00.000Z',
        },
      ],
      now,
    )
    expect(summary.state).toBe('connected')
    expect(summary.source).toBe('cc_agent_events')
    expect(summary.ageSeconds).toBe(60)
  })

  it('summarises empty events as offline / no_heartbeat', () => {
    const summary = summariseRunnerHeartbeat([], now)
    expect(summary).toMatchObject({
      state: 'offline',
      source: 'no_heartbeat',
      ageSeconds: null,
    })
  })
})

describe('loadRunnerHeartbeat', () => {
  function clientReturning(
    data: unknown,
    error: { message: string } | null = null,
  ): AgentEventsClientLike {
    return {
      from() {
        return {
          insert: () => ({ select: async () => ({ data: null, error: null }) }),
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit: async () => ({ data, error }),
                    }
                  },
                }
              },
            }
          },
        }
      },
    }
  }

  it('maps a missing-table error to migration_not_applied', async () => {
    const summary = await loadRunnerHeartbeat(
      clientReturning(null, {
        message: 'relation "public.cc_agent_events" does not exist',
      }),
      'founder-1',
      Date.parse('2026-08-07T03:00:00.000Z'),
    )
    expect(summary.source).toBe('migration_not_applied')
    expect(summary.state).toBe('offline')
  })

  it('classifies a returned heartbeat row', async () => {
    const summary = await loadRunnerHeartbeat(
      clientReturning([
        {
          agent_name: 'nexus-runner',
          event_type: 'heartbeat',
          created_at: '2026-08-07T02:59:00.000Z',
        },
      ]),
      'founder-1',
      Date.parse('2026-08-07T03:00:00.000Z'),
    )
    expect(summary.state).toBe('connected')
    expect(summary.source).toBe('cc_agent_events')
  })
})
