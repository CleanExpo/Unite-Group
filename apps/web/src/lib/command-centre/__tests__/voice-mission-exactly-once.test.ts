// Race-safe exactly-once receipts + packet-id-reuse conflict detection.
//
// Read-only live schema proof this rests on (verified in
// supabase/migrations/20260604000000_cc_command_centre.sql):
//   cc_tasks:       UNIQUE(founder_id, external_ref)        — line 60
//   cc_task_events: id UUID PRIMARY KEY DEFAULT gen_random_uuid()  — line 71
//                   ...and NO uniqueness on (task_id, type).
//
// So exactly-once for the `created` receipt is achievable WITHOUT a migration by
// deriving a deterministic UUID from the task id plus a fixed namespaced label
// and inserting it explicitly: the PK becomes the dedupe boundary, and a 23505
// on it means "the winner already wrote it", not a failure.
import { describe, it, expect } from 'vitest'
import {
  appendTaskEventOnce,
  deterministicTaskEventId,
  CC_TASKS_TABLE,
  CC_TASK_EVENTS_TABLE,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'
import {
  ingestVoiceMission,
  buildMissionProvenance,
  parseVoiceMissionPacket,
} from '@/lib/command-centre/voice-mission-bridge'

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function packet(overrides: Record<string, unknown> = {}) {
  return {
    packet_id: 'elevenlabs_conv_9f2a',
    conversation_id: 'conv-1',
    transcript_text: 'Summarise the Tuesday client call.',
    summary: 'Summarise the Tuesday client call',
    requested_outcome: 'A filed research note',
    business_context: 'unite-group',
    risk_level: 'low',
    actions: [{ kind: 'research' }],
    ...overrides,
  }
}

// ─── Fake DB enforcing BOTH real constraints ────────────────────────────────

interface DbOptions {
  /** Barrier size for cc_task_events inserts, to force a genuine interleave. */
  eventBarrier?: number
}

function makeDb(options: DbOptions = {}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    [CC_TASKS_TABLE]: [],
    [CC_TASK_EVENTS_TABLE]: [],
  }
  let seq = 0

  // Barrier: event inserts park until `eventBarrier` of them are pending, then
  // all proceed. This guarantees the loser's receipt lookup happened BEFORE the
  // winner's insert committed — the exact interleaving a sequential test misses.
  let arrived = 0
  let release: (() => void) | null = null
  const gate =
    options.eventBarrier && options.eventBarrier > 1
      ? new Promise<void>((resolve) => {
          release = resolve
        })
      : null

  async function waitAtBarrier() {
    if (!gate) return
    arrived += 1
    if (arrived >= (options.eventBarrier ?? 0)) release?.()
    await gate
  }

  const client: SupabaseLike = {
    from(table: string) {
      const rows = (tables[table] ??= [])
      return {
        insert(values: unknown) {
          const v = values as Record<string, unknown>
          return {
            select: () => ({
              single: async () => {
                if (table === CC_TASK_EVENTS_TABLE) {
                  await waitAtBarrier()
                  // PRIMARY KEY(id) — the only uniqueness this table has.
                  if (v.id != null && rows.some((r) => r.id === v.id)) {
                    return {
                      data: null,
                      error: { code: '23505', message: 'duplicate key value violates cc_task_events_pkey' },
                    }
                  }
                  const row = { id: v.id ?? `evt-${++seq}`, ...v }
                  rows.push(row)
                  return { data: row, error: null }
                }
                // UNIQUE(founder_id, external_ref) on cc_tasks.
                if (
                  table === CC_TASKS_TABLE &&
                  v.external_ref != null &&
                  rows.some(
                    (r) => r.founder_id === v.founder_id && r.external_ref === v.external_ref,
                  )
                ) {
                  return {
                    data: null,
                    error: { code: '23505', message: 'duplicate key value' },
                  }
                }
                const row = { id: `${table}-${++seq}`, metadata: {}, ...v }
                rows.push(row)
                return { data: row, error: null }
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
            single: async () => {
              const match = rows.find((r) => filters.every(([c, v]) => r[c] === v))
              return match
                ? { data: match, error: null }
                : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
            },
            order: () => chain,
            limit: async () => ({
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

// ─── Deterministic receipt id ────────────────────────────────────────────────

describe('deterministic task-event id', () => {
  const TASK = '11111111-2222-4333-8444-555555555555'

  it('is a well-formed RFC 4122 v5 UUID', () => {
    expect(deterministicTaskEventId(TASK, 'created')).toMatch(UUID_V5)
  })

  it('is stable for the same task and label', () => {
    expect(deterministicTaskEventId(TASK, 'created')).toBe(deterministicTaskEventId(TASK, 'created'))
  })

  it('differs per task and per label', () => {
    const other = '99999999-2222-4333-8444-555555555555'
    expect(deterministicTaskEventId(TASK, 'created')).not.toBe(deterministicTaskEventId(other, 'created'))
    expect(deterministicTaskEventId(TASK, 'created')).not.toBe(deterministicTaskEventId(TASK, 'started'))
  })
})

describe('appendTaskEventOnce', () => {
  it('writes the row once and reports creation', async () => {
    const { client, tables } = makeDb()
    const result = await appendTaskEventOnce(
      { founderId: 'f1', taskId: 'task-1', type: 'created', eventKey: 'created' },
      client,
    )
    expect(result.created).toBe(true)
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(1)
    expect(tables[CC_TASK_EVENTS_TABLE][0].id).toBe(deterministicTaskEventId('task-1', 'created'))
  })

  it('treats a primary-key collision as successful reuse, not an error', async () => {
    const { client, tables } = makeDb()
    const input = { founderId: 'f1', taskId: 'task-1', type: 'created' as const, eventKey: 'created' }
    await appendTaskEventOnce(input, client)
    const second = await appendTaskEventOnce(input, client)
    expect(second.created).toBe(false)
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(1)
  })
})

// ─── Genuinely concurrent replay ─────────────────────────────────────────────

describe('concurrent replay writes exactly one receipt', () => {
  it('interleaves winner and loser receipt inserts and both report complete', async () => {
    // Barrier of 2: neither event insert commits until both have arrived, so the
    // loser's "does a receipt exist?" lookup provably ran first and saw none.
    const { client, tables } = makeDb({ eventBarrier: 2 })

    const [a, b] = await Promise.all([
      ingestVoiceMission('f1', packet(), client),
      ingestVoiceMission('f1', packet(), client),
    ])

    expect(tables[CC_TASKS_TABLE]).toHaveLength(1)
    expect(tables[CC_TASK_EVENTS_TABLE].filter((e) => e.type === 'created')).toHaveLength(1)

    for (const result of [a, b]) {
      expect(result.status).not.toBe('rejected')
      if (result.status === 'rejected') continue
      expect(result.receipt).toBe('complete')
    }

    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual(['created', 'duplicate'])
  })
})

// ─── Packet-id reuse with a changed control payload ─────────────────────────

describe('packet id reuse with changed payload is a conflict, not a duplicate', () => {
  it('dedupes an exact replay', async () => {
    const { client, tables } = makeDb()
    await ingestVoiceMission('f1', packet(), client)
    const second = await ingestVoiceMission('f1', packet(), client)
    expect(second.status).toBe('duplicate')
    expect(tables[CC_TASKS_TABLE]).toHaveLength(1)
  })

  it.each([
    ['risk', { risk_level: 'critical' }],
    ['objective', { requested_outcome: 'wire the funds instead' }],
    ['actions', { actions: [{ kind: 'payments' }] }],
    ['title', { summary: 'A completely different mission' }],
    ['approval flag', { approval_required: true }],
    ['business context', { business_context: 'other-client' }],
    ['conversation', { conversation_id: 'conv-999' }],
  ])('conflicts when %s changes under the same packet id', async (_label, change) => {
    const { client, tables } = makeDb()
    await ingestVoiceMission('f1', packet(), client)
    const second = await ingestVoiceMission('f1', packet(change), client)

    expect(second.status).toBe('conflict')
    if (second.status !== 'conflict') return
    expect(second.reason).toBe('provenance_mismatch')
    // The original mission is untouched and no repair was written under the
    // changed payload.
    expect(tables[CC_TASKS_TABLE]).toHaveLength(1)
  })

  it('blocks repair when the persisted provenance is missing', async () => {
    const { client, tables } = makeDb()
    await ingestVoiceMission('f1', packet(), client)
    // Simulate a row written before provenance existed, or stripped since.
    const task = tables[CC_TASKS_TABLE][0] as { metadata: Record<string, unknown> }
    delete (task.metadata.voiceMission as Record<string, unknown>).provenance

    const second = await ingestVoiceMission('f1', packet(), client)
    expect(second.status).toBe('conflict')
    if (second.status !== 'conflict') return
    expect(second.reason).toBe('provenance_unverifiable')
  })

  it('blocks repair when the persisted provenance is forged', async () => {
    const { client, tables } = makeDb()
    await ingestVoiceMission('f1', packet(), client)
    const task = tables[CC_TASKS_TABLE][0] as { metadata: Record<string, unknown> }
    ;(task.metadata.voiceMission as Record<string, unknown>).provenance = { missionHash: 'not-a-hash' }

    const second = await ingestVoiceMission('f1', packet(), client)
    expect(second.status).toBe('conflict')
    if (second.status !== 'conflict') return
    expect(second.reason).toBe('provenance_unverifiable')
  })
})

// ─── Provenance covers every control field ──────────────────────────────────

describe('provenance covers every task-affecting field', () => {
  function hashFor(overrides: Record<string, unknown> = {}) {
    const parsed = parseVoiceMissionPacket(packet(overrides))
    if (!parsed.ok) throw new Error(`fixture must parse: ${parsed.reasons.join(', ')}`)
    return buildMissionProvenance(parsed.mission).missionHash
  }

  it('changes when any control field changes', () => {
    const base = hashFor()
    const variants: Array<[string, Record<string, unknown>]> = [
      ['packet id', { packet_id: 'other_packet' }],
      ['title', { summary: 'Another summary' }],
      ['objective', { requested_outcome: 'Another outcome' }],
      ['risk', { risk_level: 'high' }],
      ['approval requested', { approval_required: true }],
      ['approval reason', { approval_reason: 'because' }],
      ['actions', { actions: [{ kind: 'draft' }] }],
      ['business context', { business_context: 'elsewhere' }],
      ['conversation id', { conversation_id: 'conv-2' }],
    ]
    for (const [label, change] of variants) {
      expect(hashFor(change), `${label} must change the mission hash`).not.toBe(base)
    }
  })

  it('is stable across action ordering, which is not semantic', () => {
    const a = hashFor({ actions: [{ kind: 'research' }, { kind: 'draft' }] })
    const b = hashFor({ actions: [{ kind: 'draft' }, { kind: 'research' }] })
    expect(a).toBe(b)
  })
})
