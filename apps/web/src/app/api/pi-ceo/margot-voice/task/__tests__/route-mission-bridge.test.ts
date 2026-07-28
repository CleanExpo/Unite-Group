// Coverage for the voice → cc_tasks mission bridge wired into the ingest route.
// Kept separate from route.test.ts so the original regression contract for the
// margot_voice_sessions write stays untouched.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

interface FakeRow extends Record<string, unknown> {
  id: string
}

const tables: Record<string, FakeRow[]> = {}
let seq = 0

// A table-aware service-client fake that enforces UNIQUE(founder_id, external_ref)
// on cc_tasks the way Postgres does, so the route's idempotency is exercised
// rather than assumed.
function makeClient() {
  return {
    from(table: string) {
      const rows = (tables[table] ??= [])
      return {
        insert(values: Record<string, unknown>) {
          const eventPkClash =
            table === 'cc_task_events' &&
            values.id != null &&
            rows.some((r) => r.id === values.id)
          const duplicate =
            table === 'cc_tasks' &&
            rows.some(
              (r) =>
                r.founder_id === values.founder_id && r.external_ref === values.external_ref,
            )
          return {
            select: () => ({
              single: () => {
                if (eventPkClash) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates cc_task_events_pkey' },
                  })
                }
                if (duplicate) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value' },
                  })
                }
                const row: FakeRow = { id: (values.id as string) ?? `${table}-${++seq}`, ...values }
                rows.push(row)
                return Promise.resolve({ data: row, error: null })
              },
            }),
          }
        },
        select() {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq(column: string, value: unknown) {
              filters.push([column, value])
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
          }
          return chain
        },
      }
    },
  }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => makeClient()),
}))

import { POST } from '../route'
import { VOICE_MISSION_AUTONOMY_ENV } from '@/lib/command-centre/voice-mission-bridge'

const ORIGINAL_ENV = { ...process.env }
const TOKEN = 'ingest-token-123'
const FOUNDER = 'founder-uuid'

function req(body: unknown) {
  return new Request('https://app.test/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  }) as never
}

const packet = {
  packet_id: 'pkt-bridge-1',
  summary: 'Summarise the Tuesday client call',
  transcript_text: 'Please summarise the Tuesday client call and file a research note.',
  conversation_id: 'conv-1',
  risk_level: 'low',
  actions: [{ kind: 'research' }],
}

interface MissionBody {
  mission: {
    status: string
    task_id: string | null
    task_status: string | null
    tier: string | null
    reason: string | null
  }
}

describe('POST /api/pi-ceo/margot-voice/task — mission bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(tables)) delete tables[key]
    seq = 0
    process.env.ELEVENLABS_INGEST_TOKEN = TOKEN
    process.env.FOUNDER_USER_ID = FOUNDER
    delete process.env[VOICE_MISSION_AUTONOMY_ENV]
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('creates a founder-scoped cc_tasks mission alongside the voice session', async () => {
    const res = await POST(req(packet))
    expect(res.status).toBe(200)
    const body = (await res.json()) as MissionBody

    expect(body.mission.status).toBe('created')
    expect(body.mission.task_id).toBeTruthy()
    expect(tables.margot_voice_sessions).toHaveLength(1)
    expect(tables.cc_tasks).toHaveLength(1)
    expect(tables.cc_tasks[0].founder_id).toBe(FOUNDER)
    expect(tables.cc_tasks[0].external_ref).toBe('voice:pkt-bridge-1')
  })

  it('parks the mission for approval while the estate is unarmed', async () => {
    const res = await POST(req(packet))
    const body = (await res.json()) as MissionBody
    expect(body.mission.task_status).toBe('awaiting_approval')
    expect(body.mission.reason).toBe('kill_switch_off')
    expect(tables.cc_tasks[0].human_approval_required).toBe(true)
  })

  it('never mints a runner-claimable mission from a voice packet', async () => {
    process.env[VOICE_MISSION_AUTONOMY_ENV] = '1'
    await POST(req(packet))
    expect(['proposed', 'awaiting_approval']).toContain(tables.cc_tasks[0].status)
    expect(tables.cc_tasks[0].status).not.toBe('queued')
    expect(tables.cc_tasks[0].status).not.toBe('running')
  })

  // (F) Honest scope: the MISSION is idempotent (one cc_tasks row, enforced by
  // UNIQUE(founder_id, external_ref)). The DELIVERY LEDGER is not —
  // margot_voice_sessions has no unique constraint on packet_id, so a redelivery
  // records a second session row. That is a schema-gated migration, not
  // something this slice may apply, so it is asserted here as a known limit
  // rather than described as end-to-end idempotency.
  it('dedupes the mission but still records both deliveries in the session ledger', async () => {
    const first = (await (await POST(req(packet))).json()) as MissionBody
    const second = (await (await POST(req(packet))).json()) as MissionBody

    expect(first.mission.status).toBe('created')
    expect(second.mission.status).toBe('duplicate')
    expect(second.mission.task_id).toBe(first.mission.task_id)
    expect(tables.cc_tasks).toHaveLength(1)
    // The voice session ledger still records both deliveries — only the mission
    // authority is deduplicated.
    expect(tables.margot_voice_sessions).toHaveLength(2)
  })

  it('does not copy the transcript into the mission row', async () => {
    await POST(
      req({
        ...packet,
        transcript_text: 'the deploy key is AKIAIOSFODNN7EXAMPLE do not share it',
      }),
    )
    const serialised = JSON.stringify(tables.cc_tasks[0])
    expect(serialised).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(serialised).not.toContain('do not share it')
  })

  it('refuses a client-supplied founder_id at the bridge', async () => {
    const res = await POST(req({ ...packet, founder_id: 'attacker' }))
    const body = (await res.json()) as MissionBody
    expect(body.mission.status).toBe('rejected')
    expect(body.mission.reason).toContain('founder_id')
    expect(tables.cc_tasks ?? []).toHaveLength(0)
  })

  it('surfaces the receipt state so an unwritten audit trail is visible', async () => {
    const res = await POST(req(packet))
    const body = (await res.json()) as MissionBody & { mission: { receipt: string } }
    expect(body.mission.receipt).toBe('complete')
  })

  it('rejects a packet with no risk_level rather than assuming low', async () => {
    const { risk_level: _omitted, ...noRisk } = packet
    const res = await POST(req(noRisk))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_packet')
    expect(tables.margot_voice_sessions ?? []).toHaveLength(0)
    expect(tables.cc_tasks ?? []).toHaveLength(0)
  })

  it('rejects an unrecognised risk_level rather than coercing it to low', async () => {
    for (const risk of ['severe', 'LOW', 'unknown', '']) {
      for (const key of Object.keys(tables)) delete tables[key]
      const res = await POST(req({ ...packet, risk_level: risk }))
      expect(res.status).toBe(400)
      expect(tables.margot_voice_sessions ?? []).toHaveLength(0)
    }
  })

  it('binds immutable provenance to the persisted mission', async () => {
    await POST(req(packet))
    const meta = tables.cc_tasks[0].metadata as {
      voiceMission: { provenance: { missionHash: string } }
    }
    expect(meta.voiceMission.provenance.missionHash).toMatch(/^[a-f0-9]{32,64}$/)
  })

  it('returns 409 when a packet id is reused with a changed control payload', async () => {
    const first = await POST(req(packet))
    expect(first.status).toBe(200)

    const conflicting = await POST(req({ ...packet, risk_level: 'critical' }))
    expect(conflicting.status).toBe(409)
    const body = (await conflicting.json()) as MissionBody & { ok: boolean }
    expect(body.ok).toBe(false)
    expect(body.mission.status).toBe('conflict')
    expect(body.mission.reason).toBe('provenance_mismatch')

    // The original mission is untouched — a conflicting redelivery must not
    // mutate or duplicate it.
    expect(tables.cc_tasks).toHaveLength(1)
    expect(tables.cc_tasks[0].risk_level).toBe('low')
  })

  it('still records the delivery in the session ledger on conflict', async () => {
    await POST(req(packet))
    await POST(req({ ...packet, requested_outcome: 'something else entirely' }))
    // Two deliveries happened and both are accounted for, even though the
    // second was refused as a mission.
    expect(tables.margot_voice_sessions).toHaveLength(2)
    expect(tables.cc_tasks).toHaveLength(1)
  })

  it('writes exactly one created receipt across an exact replay', async () => {
    await POST(req(packet))
    await POST(req(packet))
    expect(tables.cc_task_events.filter((e) => e.type === 'created')).toHaveLength(1)
  })
})
