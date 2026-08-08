// Fail-closed contracts raised by independent review (REQUEST_CHANGES) and by
// the supervisor's live-prod evidence. Each block names the finding it closes.
//
// Live-prod context that makes these load-bearing: cc_tasks=48 real rows exist,
// margot_voice_sessions=0, and claimNextQueuedTask filters only
// (founder_id, status='queued') — so arming a runner without an explicit voice
// eligibility policy would let it claim arbitrary stale backlog. Runner
// eligibility is therefore a hard blocker, not a nicety.
import { describe, it, expect } from 'vitest'
import {
  parseVoiceMissionPacket,
  canonicalPacketId,
  voiceMissionExternalRef,
  buildMissionProvenance,
  classifyVoiceMission,
  voiceMissionToCreateTaskInput,
  ingestVoiceMission,
  VOICE_MISSION_AUTONOMY_ENV,
  type NormalisedVoiceMission,
} from '@/lib/command-centre/voice-mission-bridge'
import {
  admitMissionToLane,
  runMissionInLane,
  missionOutcomeToRelease,
  type MissionLaneRunner,
} from '@/lib/command-centre/mission-lane-binding'
import {
  CC_TASKS_TABLE,
  CC_TASK_EVENTS_TABLE,
  type CommandCentreTask,
  type SupabaseLike,
  type TaskStatus,
} from '@/lib/command-centre/tasks'

function packet(overrides: Record<string, unknown> = {}) {
  return {
    packet_id: 'elevenlabs_conv_9f2a',
    transcript_text: 'Summarise the Tuesday client call.',
    summary: 'Summarise the Tuesday client call',
    risk_level: 'low',
    actions: [{ kind: 'research' }],
    ...overrides,
  }
}

function missionFixture(overrides: Partial<NormalisedVoiceMission> = {}): NormalisedVoiceMission {
  const parsed = parseVoiceMissionPacket(packet())
  if (!parsed.ok) throw new Error(`fixture must parse: ${parsed.reasons.join(', ')}`)
  return { ...parsed.mission, ...overrides }
}

// ─── (A) risk_level must never silently default to low ───────────────────────

describe('(A) risk level is explicit or refused', () => {
  it('rejects a packet with no risk_level rather than assuming low', () => {
    const parsed = parseVoiceMissionPacket(packet({ risk_level: undefined }))
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.reasons.join(' ')).toContain('risk_level')
  })

  it('rejects an unknown risk_level rather than coercing it to low', () => {
    for (const risk of ['severe', 'LOW ish', '1', 'null', '']) {
      const parsed = parseVoiceMissionPacket(packet({ risk_level: risk }))
      expect(parsed.ok).toBe(false)
      if (parsed.ok) continue
      expect(parsed.reasons.join(' ')).toContain('risk_level')
    }
  })

  it('accepts each of the four declared risk levels verbatim', () => {
    for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
      const parsed = parseVoiceMissionPacket(packet({ risk_level: risk }))
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) continue
      expect(parsed.mission.riskLevel).toBe(risk)
    }
  })
})

// ─── (B) packet_id canonical form is non-empty and collision resistant ───────

describe('(B) packet id canonicalisation', () => {
  it('refuses an id that carries no admissible characters', () => {
    for (const id of ['...', '???', '   ', '★★★', '​​']) {
      expect(canonicalPacketId(id)).toBeNull()
    }
  })

  it('never produces a bare or empty external ref', () => {
    for (const id of ['...', '???', '★★★']) {
      const parsed = parseVoiceMissionPacket(packet({ packet_id: id }))
      expect(parsed.ok).toBe(false)
      if (parsed.ok) continue
      expect(parsed.reasons.join(' ')).toContain('packet_id')
    }
  })

  it('does not collapse distinct ids onto the same external ref', () => {
    // These all reduce to the same string under a naive strip-unsafe-characters
    // canonicaliser, which would silently merge three different missions.
    const ids = ['a-b', 'a b', 'a/b', 'a★b', 'a..b']
    const admitted = ids.filter((id) => canonicalPacketId(id) !== null)
    const refs = admitted.map((id) => voiceMissionExternalRef(id))
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('is stable and round-trips an already-canonical id unchanged', () => {
    expect(canonicalPacketId('elevenlabs_conv_9f2a')).toBe('elevenlabs_conv_9f2a')
    expect(voiceMissionExternalRef('elevenlabs_conv_9f2a')).toBe('voice:elevenlabs_conv_9f2a')
  })

  it('binds immutable provenance to the packet content, not just its id', () => {
    const a = buildMissionProvenance(missionFixture())
    const b = buildMissionProvenance(missionFixture())
    expect(a.missionHash).toBe(b.missionHash)
    expect(a.missionHash).toMatch(/^[a-f0-9]{32,64}$/)

    const other = buildMissionProvenance(missionFixture({ objective: 'a different objective' }))
    expect(other.missionHash).not.toBe(a.missionHash)
  })
})

// ─── (C) admission verdict must be fully validated before dispatch ───────────

function taskWith(status: TaskStatus, metadata: Record<string, unknown>): CommandCentreTask {
  return {
    id: 'task-1',
    founder_id: 'f1',
    external_ref: 'voice:pkt-1',
    queue_id: null,
    project_id: null,
    project_key: 'unite-group',
    title: 'x',
    objective: 'y',
    priority: 'P2',
    status,
    agent_owner: 'margot-voice',
    risk_level: 'low',
    execution_mode: 'branch-preview',
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

function armedMetadata() {
  const previous = process.env[VOICE_MISSION_AUTONOMY_ENV]
  process.env[VOICE_MISSION_AUTONOMY_ENV] = '1'
  const m = missionFixture()
  const input = voiceMissionToCreateTaskInput(m, classifyVoiceMission(m), 'f1')
  if (previous === undefined) delete process.env[VOICE_MISSION_AUTONOMY_ENV]
  else process.env[VOICE_MISSION_AUTONOMY_ENV] = previous
  return input.metadata as Record<string, unknown>
}

const HEALTHY = { inFlight: 0, maxConcurrent: 2, hardStop: false, laneAvailable: true }

describe('(C) admission verdict is validated field by field', () => {
  const REQUIRED = [
    'tier',
    'safe',
    'sideEffecting',
    'reason',
    'initialStatus',
    'executionMode',
    'humanApprovalRequired',
  ] as const

  it('refuses a verdict missing any required field', () => {
    const meta = armedMetadata()
    const full = (meta.voiceMission as { admission: Record<string, unknown> }).admission
    for (const field of REQUIRED) {
      const partial = { ...full }
      delete partial[field]
      const decision = admitMissionToLane(
        taskWith('queued', { voiceMission: { ...(meta.voiceMission as object), admission: partial } }),
        HEALTHY,
      )
      expect(decision.admit).toBe(false)
      expect(decision.code).toBe('risk_unclassified')
    }
  })

  it('refuses a verdict whose fields are the wrong type', () => {
    const meta = armedMetadata()
    const full = (meta.voiceMission as { admission: Record<string, unknown> }).admission
    const corruptions: Array<Record<string, unknown>> = [
      { ...full, sideEffecting: 'false' },
      { ...full, safe: 'true' },
      { ...full, tier: 'L9' },
      { ...full, reason: '' },
      { ...full, reason: 'not a machine code!' },
      { ...full, initialStatus: 'queued' },
      { ...full, executionMode: 'overnight-yolo' },
      { ...full, humanApprovalRequired: 1 },
    ]
    for (const admission of corruptions) {
      const decision = admitMissionToLane(
        taskWith('queued', { voiceMission: { ...(meta.voiceMission as object), admission } }),
        HEALTHY,
      )
      expect(decision.admit).toBe(false)
      expect(decision.code).toBe('risk_unclassified')
    }
  })

  it('refuses a mission whose immutable provenance is absent', () => {
    const meta = armedMetadata()
    const voiceMission = { ...(meta.voiceMission as Record<string, unknown>) }
    delete voiceMission.provenance
    const decision = admitMissionToLane(taskWith('queued', { voiceMission }), HEALTHY)
    expect(decision.admit).toBe(false)
    expect(decision.code).toBe('provenance_missing')
  })
})

// ─── Supervisor blocker: generic queued backlog must never be claimed ────────

describe('runner eligibility rejects generic queued backlog', () => {
  it('refuses a real non-voice cc_tasks backlog row', () => {
    // Shaped like the 48 rows that already exist in prod: queued, no voice
    // metadata at all. Arming a runner must not make these claimable.
    const backlog = taskWith('queued', { signalSource: 'github', signalSeverity: 'warn' })
    const decision = admitMissionToLane(backlog, HEALTHY)
    expect(decision.admit).toBe(false)
    expect(decision.code).toBe('risk_unclassified')
  })

  it('refuses a backlog row even when an attacker forges a partial envelope', () => {
    const forged = taskWith('queued', {
      voiceMission: { admission: { tier: 'L1', safe: true } },
    })
    const decision = admitMissionToLane(forged, HEALTHY)
    expect(decision.admit).toBe(false)
    expect(decision.code).toBe('risk_unclassified')
  })
})

// ─── (D) HARD_STOP must abort an already-running mission ────────────────────

describe('(D) HARD_STOP aborts an active run', () => {
  it('stops a run that has already started and never requeues it', async () => {
    let started = false
    let aborted = false
    let hardStop = false

    const runner: MissionLaneRunner = {
      run(_mission, opts) {
        started = true
        hardStop = true // the switch is thrown after the runner is in flight
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            aborted = true
            reject(new Error('aborted'))
          })
        })
      },
    }

    const result = await runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'note' },
      { hardStop: () => hardStop, hardStopPollMs: 5, timeoutMs: 5_000 },
    )

    expect(started).toBe(true)
    expect(aborted).toBe(true)
    expect(result.outcome).toBe('hard_stopped')
    expect(missionOutcomeToRelease(result.outcome).outcome).toBe('failed')
    expect(missionOutcomeToRelease(result.outcome).outcome).not.toBe('requeue')
  })

  it('clears its watcher so a completed run leaves no live timer', async () => {
    const runner: MissionLaneRunner = { run: () => Promise.resolve({ output: 'ok' }) }
    const before = process.listenerCount('unhandledRejection')
    const result = await runMissionInLane(
      runner,
      { ref: 'voice:pkt-1', objective: 'note' },
      { hardStop: () => false, hardStopPollMs: 5 },
    )
    expect(result.outcome).toBe('completed')
    expect(process.listenerCount('unhandledRejection')).toBe(before)
  })
})

// ─── (E) receipt honesty when the audit event cannot be written ─────────────

function makeDb(options: { failEvents?: boolean } = {}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    [CC_TASKS_TABLE]: [],
    [CC_TASK_EVENTS_TABLE]: [],
  }
  let seq = 0
  const client: SupabaseLike = {
    from(table: string) {
      const rows = (tables[table] ??= [])
      return {
        insert(values: unknown) {
          const v = values as Record<string, unknown>
          return {
            select: () => ({
              single: () => {
                if (table === CC_TASK_EVENTS_TABLE && options.failEvents) {
                  return Promise.resolve({ data: null, error: { message: 'events table missing' } })
                }
                // cc_task_events' only uniqueness is PRIMARY KEY(id); the
                // bridge supplies a deterministic id, so a repeat insert must
                // collide here exactly as Postgres would.
                if (table === CC_TASK_EVENTS_TABLE && v.id != null && rows.some((r) => r.id === v.id)) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates cc_task_events_pkey' },
                  })
                }
                const duplicate =
                  table === CC_TASKS_TABLE &&
                  rows.some(
                    (r) => r.founder_id === v.founder_id && r.external_ref === v.external_ref,
                  )
                if (duplicate) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key' },
                  })
                }
                const row = { id: v.id ?? `${table}-${++seq}`, metadata: {}, ...v }
                rows.push(row)
                return Promise.resolve({ data: row, error: null })
              },
            }),
          }
        },
        update() {
          throw new Error('unused')
        },
        select() {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq(c: string, v: unknown) {
              filters.push([c, v])
              return chain
            },
            single: () => {
              const match = rows.find((r) => filters.every(([c, v]) => r[c] === v))
              return Promise.resolve(
                match
                  ? { data: match, error: null }
                  : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
              )
            },
            order: () => chain,
            limit: () =>
              Promise.resolve({
                data: rows.filter((r) => filters.every(([c, v]) => r[c] === v)),
                error: null,
              }),
          }
          return chain as never
        },
      }
    },
  } as unknown as SupabaseLike
  return { client, tables }
}

describe('(E) receipt completeness is reported, never assumed', () => {
  it('reports an incomplete receipt when the created event cannot be written', async () => {
    const { client, tables } = makeDb({ failEvents: true })
    const result = await ingestVoiceMission('f1', packet(), client)
    expect(result.status).toBe('created_incomplete')
    expect(tables[CC_TASKS_TABLE]).toHaveLength(1)
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(0)
    if (result.status === 'rejected') return
    expect(result.receipt).toBe('incomplete')
  })

  it('repairs a missing receipt on replay instead of reporting a clean duplicate', async () => {
    const failing = makeDb({ failEvents: true })
    const first = await ingestVoiceMission('f1', packet(), failing.client)
    expect(first.status).toBe('created_incomplete')

    // Same rows, but the events table is writable on the retry.
    const healed = makeDb()
    healed.tables[CC_TASKS_TABLE].push(...failing.tables[CC_TASKS_TABLE])

    const second = await ingestVoiceMission('f1', packet(), healed.client)
    expect(second.status).toBe('duplicate')
    if (second.status === 'rejected') return
    expect(second.receipt).toBe('complete')
    expect(healed.tables[CC_TASK_EVENTS_TABLE]).toHaveLength(1)
  })

  it('does not append a second created event when the receipt already exists', async () => {
    const { client, tables } = makeDb()
    await ingestVoiceMission('f1', packet(), client)
    const second = await ingestVoiceMission('f1', packet(), client)
    expect(second.status).toBe('duplicate')
    expect(tables[CC_TASK_EVENTS_TABLE].filter((e) => e.type === 'created')).toHaveLength(1)
  })
})
