import { describe, it, expect } from 'vitest'
import {
  admitMissionToLane,
  missionOutcomeToRelease,
  runMissionInLane,
  toMissionControlRow,
  MISSION_LANE_DEFAULT_TIMEOUT_MS,
  type MissionLaneRunner,
} from '@/lib/command-centre/mission-lane-binding'
import {
  classifyVoiceMission,
  parseVoiceMissionPacket,
  voiceMissionToCreateTaskInput,
  VOICE_MISSION_AUTONOMY_ENV,
} from '@/lib/command-centre/voice-mission-bridge'
import type { CommandCentreTask, TaskStatus } from '@/lib/command-centre/tasks'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function taskWith(
  status: TaskStatus,
  metadata: Record<string, unknown> = {},
): CommandCentreTask {
  return {
    id: 'task-1',
    founder_id: 'f1',
    external_ref: 'voice:pkt-1',
    queue_id: null,
    project_id: null,
    project_key: 'unite-group',
    title: 'Summarise the Tuesday call',
    objective: 'Produce a filed research note',
    priority: 'P2',
    status,
    agent_owner: 'margot-voice',
    risk_level: 'low',
    execution_mode: 'local-code',
    origin: 'idea',
    dependencies: [],
    human_approval_required: false,
    evidence_path: null,
    validation_required: [],
    linear_id: null,
    preview_url: null,
    metadata,
    created_at: '2026-07-28T00:00:00.000Z',
    updated_at: '2026-07-28T00:00:00.000Z',
  }
}

/** Build the metadata a bridged voice mission actually carries. */
function voiceMetadata(armed: boolean, overrides: Record<string, unknown> = {}) {
  const previous = process.env[VOICE_MISSION_AUTONOMY_ENV]
  if (armed) process.env[VOICE_MISSION_AUTONOMY_ENV] = '1'
  else delete process.env[VOICE_MISSION_AUTONOMY_ENV]
  const parsed = parseVoiceMissionPacket({
    packet_id: 'pkt-1',
    transcript_text: 'summarise the tuesday call',
    summary: 'Summarise the Tuesday call',
    risk_level: 'low',
    actions: [{ kind: 'research' }],
  })
  if (!parsed.ok) throw new Error('fixture must parse')
  const input = voiceMissionToCreateTaskInput(parsed.mission, classifyVoiceMission(parsed.mission), 'f1')
  if (previous === undefined) delete process.env[VOICE_MISSION_AUTONOMY_ENV]
  else process.env[VOICE_MISSION_AUTONOMY_ENV] = previous
  const meta = input.metadata as Record<string, unknown>
  const voiceMission = { ...(meta.voiceMission as Record<string, unknown>), ...overrides }
  return { voiceMission }
}

const HEALTHY = { inFlight: 0, maxConcurrent: 2, hardStop: false, laneAvailable: true }

// ─── SUITE C1 — runner/lane admission + backpressure ─────────────────────────

describe('mission lane admission', () => {
  it('admits a queued, explicitly safe L1 mission', () => {
    const decision = admitMissionToLane(taskWith('queued', voiceMetadata(true)), HEALTHY)
    expect(decision).toEqual({ admit: true, code: 'admitted' })
  })

  it('refuses every status other than queued', () => {
    for (const status of ['proposed', 'awaiting_approval', 'running', 'blocked', 'done', 'failed'] as const) {
      const decision = admitMissionToLane(taskWith(status, voiceMetadata(true)), HEALTHY)
      expect(decision.admit).toBe(false)
      expect(decision.code).toBe('not_queued')
    }
  })

  it('refuses a task carrying no admission verdict — fail closed on absence', () => {
    const decision = admitMissionToLane(taskWith('queued', {}), HEALTHY)
    expect(decision).toEqual({ admit: false, code: 'risk_unclassified' })
  })

  it('refuses a mission that was never marked safe, even if it reached queued', () => {
    const decision = admitMissionToLane(taskWith('queued', voiceMetadata(false)), HEALTHY)
    expect(decision.admit).toBe(false)
    expect(decision.code).toBe('admission_not_safe')
  })

  it('refuses a side-effecting mission even at L1', () => {
    const meta = voiceMetadata(true)
    const decision = admitMissionToLane(
      taskWith('queued', {
        voiceMission: {
          ...meta.voiceMission,
          admission: { ...(meta.voiceMission as never as { admission: object }).admission, sideEffecting: true },
        },
      }),
      HEALTHY,
    )
    expect(decision).toEqual({ admit: false, code: 'side_effecting' })
  })

  it('refuses a tier above L1', () => {
    const meta = voiceMetadata(true)
    for (const tier of ['L2', 'L3'] as const) {
      const decision = admitMissionToLane(
        taskWith('queued', {
          voiceMission: {
            ...meta.voiceMission,
            admission: { ...(meta.voiceMission as never as { admission: object }).admission, tier },
          },
        }),
        HEALTHY,
      )
      expect(decision).toEqual({ admit: false, code: 'tier_not_admissible' })
    }
  })

  it('refuses everything while HARD_STOP is present, before any other check', () => {
    const decision = admitMissionToLane(taskWith('queued', voiceMetadata(true)), {
      ...HEALTHY,
      hardStop: true,
    })
    expect(decision).toEqual({ admit: false, code: 'hard_stop' })
  })

  it('reports the lane honestly as unavailable rather than admitting into nothing', () => {
    const decision = admitMissionToLane(taskWith('queued', voiceMetadata(true)), {
      ...HEALTHY,
      laneAvailable: false,
    })
    expect(decision).toEqual({ admit: false, code: 'lane_unavailable' })
  })

  it('applies backpressure at capacity as a soft refusal', () => {
    const decision = admitMissionToLane(taskWith('queued', voiceMetadata(true)), {
      ...HEALTHY,
      inFlight: 2,
      maxConcurrent: 2,
    })
    expect(decision).toEqual({ admit: false, code: 'at_capacity' })
  })
})

// ─── Terminal outcome mapping ────────────────────────────────────────────────

describe('mission outcome release mapping', () => {
  it('never requeues a hard stop or a cancellation', () => {
    for (const outcome of ['hard_stopped', 'cancelled'] as const) {
      const release = missionOutcomeToRelease(outcome)
      expect(release.outcome).toBe('failed')
      expect(release.outcome).not.toBe('requeue')
    }
  })

  it('requeues a timeout and a crash so the work is not silently lost', () => {
    expect(missionOutcomeToRelease('timed_out').outcome).toBe('requeue')
    expect(missionOutcomeToRelease('crashed').outcome).toBe('requeue')
  })

  it('completes cleanly and always carries a machine-safe code', () => {
    expect(missionOutcomeToRelease('completed').outcome).toBe('done')
    for (const outcome of ['completed', 'timed_out', 'cancelled', 'hard_stopped', 'crashed'] as const) {
      expect(missionOutcomeToRelease(outcome).code).toMatch(/^[a-z0-9_]+$/)
    }
  })
})

// ─── SUITE C2 — cancellation / HARD_STOP / timeout against a mock runner ─────

function mockRunner(behaviour: 'resolve' | 'hang' | 'throw', output = 'ok'): MissionLaneRunner & {
  calls: number
  aborted: boolean
} {
  const state = { calls: 0, aborted: false }
  return {
    get calls() {
      return state.calls
    },
    get aborted() {
      return state.aborted
    },
    run(_mission, opts) {
      state.calls += 1
      if (behaviour === 'throw') return Promise.reject(new Error('lane crashed'))
      if (behaviour === 'resolve') return Promise.resolve({ output })
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          state.aborted = true
          reject(new Error('aborted'))
        })
      })
    },
  } as MissionLaneRunner & { calls: number; aborted: boolean }
}

describe('mission lane run', () => {
  it('completes and returns redacted output', async () => {
    const runner = mockRunner('resolve', 'done — see /Users/phill-mac/secret and sk-live_ABCDEFGHIJKL')
    const result = await runMissionInLane(runner, { ref: 'voice:pkt-1', objective: 'note' }, {})
    expect(result.outcome).toBe('completed')
    expect(result.output).not.toContain('/Users/phill-mac')
    expect(result.output).not.toContain('sk-live_ABCDEFGHIJKL')
  })

  it('refuses to start while HARD_STOP is present and never calls the runner', async () => {
    const runner = mockRunner('resolve')
    const result = await runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'note' },
      { hardStop: () => true },
    )
    expect(result.outcome).toBe('hard_stopped')
    expect(runner.calls).toBe(0)
  })

  it('aborts the in-flight runner on timeout', async () => {
    const runner = mockRunner('hang')
    const result = await runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'note' },
      { timeoutMs: 20 },
    )
    expect(result.outcome).toBe('timed_out')
    expect(runner.aborted).toBe(true)
  })

  it('propagates an external cancellation to the runner', async () => {
    const runner = mockRunner('hang')
    const controller = new AbortController()
    const pending = runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'note' },
      { signal: controller.signal, timeoutMs: 5_000 },
    )
    controller.abort()
    const result = await pending
    expect(result.outcome).toBe('cancelled')
    expect(runner.aborted).toBe(true)
  })

  it('surfaces a crash without leaking the mission text', async () => {
    const runner = mockRunner('throw')
    const result = await runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'a very secret objective string' },
      {},
    )
    expect(result.outcome).toBe('crashed')
    expect(JSON.stringify(result)).not.toContain('a very secret objective string')
  })

  it('has a bounded default timeout rather than running unbounded', () => {
    expect(MISSION_LANE_DEFAULT_TIMEOUT_MS).toBeGreaterThan(0)
    expect(MISSION_LANE_DEFAULT_TIMEOUT_MS).toBeLessThanOrEqual(600_000)
  })
})

// ─── SUITE D — honest Mission Control status ─────────────────────────────────

describe('mission control status view', () => {
  const NOW = Date.parse('2026-07-28T12:00:00.000Z')

  it('reports not_connected when no lane is attached, never a fabricated green', () => {
    const row = toMissionControlRow(taskWith('queued', voiceMetadata(true)), null, { now: NOW })
    expect(row.source).toBe('not_connected')
    expect(row.laneStatus).toBeNull()
    expect(row.lastHeartbeatAt).toBeNull()
    expect(row.status).toBe('queued')
  })

  it('reports live when a lane heartbeat is inside the window', () => {
    const row = toMissionControlRow(taskWith('running', voiceMetadata(true)), {
      laneStatus: 'running',
      lastHeartbeatAt: new Date(NOW - 30_000).toISOString(),
    }, { now: NOW })
    expect(row.source).toBe('live')
    expect(row.laneStatus).toBe('running')
  })

  it('reports stale rather than healthy when the heartbeat has aged out', () => {
    const row = toMissionControlRow(taskWith('running', voiceMetadata(true)), {
      laneStatus: 'running',
      lastHeartbeatAt: new Date(NOW - 10 * 60_000).toISOString(),
    }, { now: NOW, staleAfterMs: 120_000 })
    expect(row.source).toBe('stale')
  })

  it('explains why a parked mission is parked', () => {
    const row = toMissionControlRow(taskWith('awaiting_approval', voiceMetadata(false)), null, { now: NOW })
    expect(row.gate).toBe('awaiting_approval')
    expect(row.gateReason).toBe('kill_switch_off')
    expect(row.tier).toBe('L1')
  })

  it('never leaks a worktree path or transcript into the surfaced row', () => {
    const row = toMissionControlRow(taskWith('running', voiceMetadata(true)), {
      laneStatus: 'running',
      lastHeartbeatAt: new Date(NOW).toISOString(),
      worktree: '/Users/phill-mac/.hermes/lanes/lane-1',
    }, { now: NOW })
    expect(JSON.stringify(row)).not.toContain('/Users/phill-mac')
  })
})
