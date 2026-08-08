// Recovery of a pre-rollout voice mission after the keyed-provenance rollout.
//
// The previous commit added a `recover_packet_id` pointer to the refusal event
// and never proved the path it pointed at worked. It did not: re-POSTing the
// packet landed on ingestVoiceMission, found the existing task through
// UNIQUE(founder_id, external_ref), compared the new HMAC against the old
// unkeyed SHA-256, and returned provenance_mismatch. The pointer led to a dead
// end and the founder's approved work stayed terminally failed.
//
// These tests exercise the recovery end to end against a table-aware fake that
// enforces the same unique constraint Postgres does, so "recoverable" is a
// demonstrated property rather than an assertion in a comment.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ingestVoiceMission,
  voiceMissionExternalRef,
  voiceMissionRekeyedExternalRef,
  VOICE_MISSION_AUTONOMY_ENV,
} from '@/lib/command-centre/voice-mission-bridge'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

const FOUNDER = 'f1'
const PACKET = 'pkt-legacy-1'

function packet() {
  return {
    packet_id: PACKET,
    transcript_text: 'summarise the tuesday call',
    summary: 'Summarise the Tuesday call',
    risk_level: 'low',
    actions: [{ kind: 'research' }],
  }
}

interface Row extends Record<string, unknown> {
  id: string
}

/** Enforces UNIQUE(founder_id, external_ref) on cc_tasks, like Postgres. */
function makeDb(seed: Row[] = []) {
  const tables: Record<string, Row[]> = { cc_tasks: [...seed], cc_task_events: [] }
  let seq = 0
  const client = {
    from(table: string) {
      const rows = (tables[table] ??= [])
      return {
        insert(values: Record<string, unknown>) {
          const dup =
            table === 'cc_tasks' &&
            rows.some(
              (r) =>
                r.founder_id === values.founder_id && r.external_ref === values.external_ref,
            )
          const pkClash =
            table === 'cc_task_events' && values.id != null && rows.some((r) => r.id === values.id)
          return {
            select: () => ({
              single: () => {
                if (dup || pkClash) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value' },
                  })
                }
                const row: Row = { id: (values.id as string) ?? `${table}-${++seq}`, ...values }
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
            order: () => chain,
            limit: (n: number) =>
              Promise.resolve({
                data: rows.filter((r) => filters.every(([c, v]) => r[c] === v)).slice(0, n),
                error: null,
              }),
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
  return { client: client as unknown as SupabaseLike, tables }
}

/** A task as the PRE-rollout bridge wrote it: unkeyed hash, no approvalRequested. */
function legacyRow(status = 'failed'): Row {
  return {
    id: 'task-legacy',
    founder_id: FOUNDER,
    external_ref: voiceMissionExternalRef(PACKET),
    status,
    title: 'Summarise the Tuesday call',
    objective: 'Summarise the Tuesday call',
    risk_level: 'low',
    project_key: 'unite-group',
    agent_owner: 'margot-voice',
    metadata: {
      voiceMission: {
        packetId: PACKET,
        provenance: { missionHash: 'a'.repeat(64) },
        admission: {
          tier: 'L1',
          safe: true,
          sideEffecting: false,
          humanApprovalRequired: false,
          reason: 'ok',
          initialStatus: 'awaiting_approval',
          executionMode: 'local-code',
        },
      },
    },
  }
}

const ORIGINAL = { ...process.env }

describe('pre-rollout voice missions are actually recoverable', () => {
  beforeEach(() => {
    process.env.MISSION_PROVENANCE_SECRET = 'test-provenance-key'
    delete process.env[VOICE_MISSION_AUTONOMY_ENV]
  })
  afterEach(() => {
    process.env = { ...ORIGINAL }
    vi.restoreAllMocks()
  })

  it('POSITIVE CONTROL: re-ingesting a legacy FAILED mission mints a signed replacement', async () => {
    const { client, tables } = makeDb([legacyRow('failed')])
    const result = await ingestVoiceMission(FOUNDER, packet(), client)

    expect(result.status).toBe('created')
    // A new row, not a repair of the old one.
    expect(tables.cc_tasks).toHaveLength(2)
    const replacement = tables.cc_tasks.find(
      (r) => r.external_ref === voiceMissionRekeyedExternalRef(PACKET),
    )
    expect(replacement).toBeDefined()
    // The failed row is untouched — it is the audit record of what happened.
    const original = tables.cc_tasks.find((r) => r.id === 'task-legacy')
    expect(original?.status).toBe('failed')
  })

  it('the replacement is born for approval, never runnable', async () => {
    // It must pass back through the founder's approval actor rather than
    // inheriting the old task's approval.
    const { client, tables } = makeDb([legacyRow('failed')])
    await ingestVoiceMission(FOUNDER, packet(), client)
    const replacement = tables.cc_tasks.find(
      (r) => r.external_ref === voiceMissionRekeyedExternalRef(PACKET),
    )
    expect(['proposed', 'awaiting_approval']).toContain(replacement?.status)
    expect(replacement?.status).not.toBe('queued')
    expect(replacement?.status).not.toBe('running')
  })

  it('the replacement carries verifiable keyed provenance', async () => {
    const { client, tables } = makeDb([legacyRow('failed')])
    await ingestVoiceMission(FOUNDER, packet(), client)
    const replacement = tables.cc_tasks.find(
      (r) => r.external_ref === voiceMissionRekeyedExternalRef(PACKET),
    )
    const envelope = (replacement?.metadata as Record<string, unknown>).voiceMission as Record<
      string,
      unknown
    >
    // The marker that dates a post-rollout envelope.
    expect(envelope).toHaveProperty('approvalRequested')
    const hash = (envelope.provenance as Record<string, unknown>).missionHash
    expect(hash).not.toBe('a'.repeat(64))
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('a SECOND recovery attempt is a duplicate, not a third task', async () => {
    const { client, tables } = makeDb([legacyRow('failed')])
    await ingestVoiceMission(FOUNDER, packet(), client)
    const second = await ingestVoiceMission(FOUNDER, packet(), client)
    expect(second.status).toBe('duplicate')
    expect(tables.cc_tasks).toHaveLength(2)
  })

  it('REGRESSION: a recovery whose receipt fails reports created_incomplete, not created', async () => {
    // The recovery branch hardcoded `status: 'created'`, so a replacement whose
    // immutable cc_task_events insert failed was acknowledged as a clean success
    // and never retried — the audit hole became permanent. Both creation paths
    // now share one decider.
    const { client, tables } = makeDb([legacyRow('failed')])
    const realFrom = (client as unknown as { from: (t: string) => unknown }).from.bind(client)
    ;(client as unknown as { from: (t: string) => unknown }).from = (table: string) => {
      if (table !== 'cc_task_events') return realFrom(table)
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { code: '500', message: 'events down' } }),
          }),
        }),
        select: () => {
          const chain = {
            eq: () => chain,
            order: () => chain,
            limit: () => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
          }
          return chain
        },
      }
    }

    const result = await ingestVoiceMission(FOUNDER, packet(), client)
    expect(result.status).toBe('created_incomplete')
    expect(result.receipt).toBe('incomplete')
    // The replacement task still exists — only its receipt is missing.
    expect(tables.cc_tasks).toHaveLength(2)
  })

  it('REGRESSION: a TRANSIENT receipt failure recovers instead of being called unresolved', async () => {
    // Dead-lettering treats a non-complete receipt as permanently unresolved, so
    // a single transient cc_task_events failure must not be enough to earn that
    // verdict. The write is retried; only a persistent failure is 'incomplete'.
    const { client, tables } = makeDb([legacyRow('failed')])
    const realFrom = (client as unknown as { from: (t: string) => unknown }).from.bind(client)
    let eventAttempts = 0
    ;(client as unknown as { from: (t: string) => unknown }).from = (table: string) => {
      if (table !== 'cc_task_events') return realFrom(table)
      const real = realFrom(table) as { insert: (v: Record<string, unknown>) => unknown }
      return {
        ...(real as object),
        insert: (values: Record<string, unknown>) => {
          eventAttempts += 1
          if (eventAttempts === 1) {
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { code: '500', message: 'blip' } }),
              }),
            }
          }
          return real.insert(values)
        },
      }
    }

    const result = await ingestVoiceMission(FOUNDER, packet(), client)
    expect(result.status).toBe('created')
    expect(result.receipt).toBe('complete')
    expect(eventAttempts).toBeGreaterThan(1)
    expect(tables.cc_task_events.length).toBe(1)
  })

  it('REGRESSION: the replacement receipt records its own ref and its lineage', async () => {
    // Without this an operator sees two rows with nothing linking them, and the
    // receipt claimed the ORIGINAL external_ref.
    const { client, tables } = makeDb([legacyRow('failed')])
    await ingestVoiceMission(FOUNDER, packet(), client)
    const receipt = tables.cc_task_events.find((e) => e.type === 'created')
    const payload = receipt?.payload as Record<string, unknown>
    expect(payload.externalRef).toBe(voiceMissionRekeyedExternalRef(PACKET))
    expect(payload.recoveredFromTaskId).toBe('task-legacy')
    expect(payload.recovery).toBe('legacy_provenance_rekey')
  })

  it('refuses to fork a legacy mission that is still LIVE', async () => {
    // The status check is what stops recovery becoming a way to duplicate an
    // active mission under a second ref.
    for (const live of ['queued', 'running', 'done', 'awaiting_approval']) {
      const { client, tables } = makeDb([legacyRow(live)])
      const result = await ingestVoiceMission(FOUNDER, packet(), client)
      expect(result.status).toBe('conflict')
      expect(tables.cc_tasks).toHaveLength(1)
    }
  })

  it('a POST-rollout failed mission is NOT treated as legacy', async () => {
    // A modern envelope that simply mismatches is a conflict, not a recovery —
    // otherwise the recovery path would launder a genuine provenance mismatch.
    const row = legacyRow('failed')
    ;(row.metadata as { voiceMission: Record<string, unknown> }).voiceMission.approvalRequested =
      false
    const { client, tables } = makeDb([row])
    const result = await ingestVoiceMission(FOUNDER, packet(), client)
    expect(result.status).toBe('conflict')
    expect(tables.cc_tasks).toHaveLength(1)
  })
})
