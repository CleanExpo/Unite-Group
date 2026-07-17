import { describe, it, expect } from 'vitest'
import { buildWorkPacket, type WorkPacket } from '@/lib/command-centre/work-packet'
import {
  CC_TASKS_TABLE,
  CC_TASK_EVENTS_TABLE,
  type CommandCentreTask,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'
import {
  packetToCreateTaskInput,
  taskToPacket,
  saveWorkPacket,
  getWorkPacket,
  listWorkPackets,
  applyPacketTransition,
  packetStatusToTaskStatus,
  taskStatusToPacketStatus,
} from '@/lib/command-centre/work-packet-store'

// ─── In-memory fake implementing SupabaseLike ────────────────────────────────
//
// A stateful store (not a single-result mock): rows persist across insert →
// select → update so the store functions can be exercised end-to-end. Only the
// chains the accessors actually use are implemented.

interface FakeRow extends Record<string, unknown> {
  id: string
  founder_id: string
}

function makeFakeDb() {
  const tables: Record<string, FakeRow[]> = {
    [CC_TASKS_TABLE]: [],
    [CC_TASK_EVENTS_TABLE]: [],
  }
  let seq = 0

  function nowIso(): string {
    return new Date().toISOString()
  }

  const client: SupabaseLike = {
    from(table: string) {
      const rows = (tables[table] ??= [])

      return {
        insert(values: unknown) {
          const ts = nowIso()
          const row: FakeRow = {
            id: `${table}-${++seq}`,
            created_at: ts,
            updated_at: ts,
            metadata: {},
            ...(values as Record<string, unknown>),
          } as FakeRow
          rows.push(row)
          return {
            select() {
              return { single: () => Promise.resolve({ data: row, error: null }) }
            },
          }
        },
        update(values: unknown) {
          const filters: Array<[string, unknown]> = []
          const apply = () => {
            const match = rows.find((r) => filters.every(([c, v]) => r[c] === v))
            if (match) Object.assign(match, values as Record<string, unknown>, { updated_at: nowIso() })
            return match ?? null
          }
          return {
            eq(c1: string, v1: unknown) {
              filters.push([c1, v1])
              return {
                eq(c2: string, v2: unknown) {
                  filters.push([c2, v2])
                  return {
                    // 2-eq path (non-guarded update, e.g. metadata): .select().single()
                    select() {
                      return {
                        single() {
                          const match = apply()
                          return Promise.resolve({
                            data: match,
                            error: match ? null : { message: 'no row' },
                          })
                        },
                      }
                    },
                    // 3-eq status-guarded path (updateTaskStatusGuarded): a third
                    // .eq(status) then .select() resolves directly to an array, so
                    // zero rows means the expected status no longer matched.
                    eq(c3: string, v3: unknown) {
                      filters.push([c3, v3])
                      return {
                        select() {
                          const match = apply()
                          return Promise.resolve({ data: match ? [match] : [], error: null })
                        },
                      }
                    },
                  }
                },
              }
            },
          }
        },
        select() {
          return {
            eq(c1: string, v1: unknown) {
              const filters: Array<[string, unknown]> = [[c1, v1]]
              const run = () => {
                const matched = rows.filter((r) => filters.every(([c, v]) => r[c] === v))
                return matched
              }
              const orderLimit = {
                order(_col: string, _opts: { ascending: boolean }) {
                  return {
                    limit(n: number) {
                      return Promise.resolve({ data: run().slice(0, n), error: null })
                    },
                  }
                },
              }
              const chain = {
                eq(c2: string, v2: unknown) {
                  filters.push([c2, v2])
                  return chain
                },
                order: orderLimit.order,
                single() {
                  const matched = run()
                  return Promise.resolve({
                    data: matched[0] ?? null,
                    error: matched[0] ? null : { code: 'PGRST116', message: 'no row' },
                  })
                },
              }
              return chain
            },
          }
        },
      }
    },
  } as unknown as SupabaseLike

  return { client, tables }
}

const FOUNDER = 'founder-1'

function samplePacket(overrides: Partial<Parameters<typeof buildWorkPacket>[0]> = {}): WorkPacket {
  return buildWorkPacket(
    { outcome: 'Ship the synthex landing refresh', projectKey: 'synthex', lane: 'coding', ...overrides },
    { now: '20260616T000000' },
  )
}

describe('work-packet-store', () => {
  it('packetToCreateTaskInput maps stable fields to columns and the rest into metadata.packet', () => {
    const packet = samplePacket()
    const input = packetToCreateTaskInput(packet, FOUNDER)

    expect(input.founderId).toBe(FOUNDER)
    expect(input.externalRef).toBe(packet.id)
    expect(input.projectKey).toBe('synthex')
    expect(input.status).toBe('proposed') // a fresh packet is 'draft' -> 'proposed'
    const meta = (input.metadata as Record<string, unknown>).packet as Record<string, unknown>
    expect(meta.lane).toBe('coding')
    expect(meta.outcome).toBe(packet.outcome)
    expect(meta.labels).toEqual(packet.labels)
  })

  it('status mapping is consistent both directions', () => {
    expect(packetStatusToTaskStatus('draft')).toBe('proposed')
    expect(packetStatusToTaskStatus('routed')).toBe('queued')
    expect(packetStatusToTaskStatus('completed')).toBe('done')
    expect(taskStatusToPacketStatus('proposed')).toBe('draft')
    expect(taskStatusToPacketStatus('done')).toBe('completed')
    expect(taskStatusToPacketStatus('failed')).toBe('blocked')
  })

  it('saveWorkPacket round-trips through taskToPacket', async () => {
    const { client } = makeFakeDb()
    const packet = samplePacket()

    const saved = await saveWorkPacket(client, FOUNDER, packet)

    expect(saved.id).toBe(packet.id)
    expect(saved.outcome).toBe(packet.outcome)
    expect(saved.projectKey).toBe('synthex')
    expect(saved.lane).toBe('coding')
    expect(saved.riskLevel).toBe(packet.riskLevel)
    expect(saved.nextActionOwner).toBe(packet.nextActionOwner)
    expect(saved.status).toBe('draft')
    expect(saved.labels).toEqual(packet.labels)
    expect(saved.approvalRequired).toBe(packet.approvalRequired)
  })

  it('getWorkPacket fetches a persisted packet by id, null when absent', async () => {
    const { client } = makeFakeDb()
    const packet = samplePacket()
    await saveWorkPacket(client, FOUNDER, packet)

    const fetched = await getWorkPacket(client, FOUNDER, packet.id)
    expect(fetched?.id).toBe(packet.id)
    expect(fetched?.outcome).toBe(packet.outcome)

    const missing = await getWorkPacket(client, FOUNDER, 'does-not-exist')
    expect(missing).toBeNull()
  })

  it('listWorkPackets returns the founder packets', async () => {
    const { client } = makeFakeDb()
    const a = samplePacket({ outcome: 'Packet A' })
    const b = samplePacket({ outcome: 'Packet B', projectKey: 'dr' })
    await saveWorkPacket(client, FOUNDER, a)
    await saveWorkPacket(client, FOUNDER, b)

    const all = await listWorkPackets(client, FOUNDER)
    const ids = all.map((p) => p.id).sort()
    expect(ids).toEqual([a.id, b.id].sort())
  })

  it('applyPacketTransition REFUSES a route that would promote proposed → queued (UNI-2417)', async () => {
    const { client, tables } = makeFakeDb()
    const packet = samplePacket()
    await saveWorkPacket(client, FOUNDER, packet)

    // route maps draft→routed == cc proposed→queued: a client-driven promotion
    // into the runner-claimable queue that bypasses the approval matrix.
    const result = await applyPacketTransition(client, FOUNDER, packet.id, { type: 'route' })

    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/illegal promotion/)
    // The backing row stays 'proposed'; nothing was promoted or audited.
    const stored = tables[CC_TASKS_TABLE][0] as unknown as CommandCentreTask
    expect(stored.status).toBe('proposed')
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(0)

    // Reloading confirms the durable status did not change.
    const reloaded = await getWorkPacket(client, FOUNDER, packet.id)
    expect(reloaded?.status).toBe('draft')
  })

  it('applyPacketTransition REFUSES an approve that would drive a task → running (UNI-2417)', async () => {
    const { client, tables } = makeFakeDb()
    const packet = samplePacket({ touchesCrmWrite: true })
    await saveWorkPacket(client, FOUNDER, packet)
    // Move the row to awaiting_approval so `approve` is otherwise packet-legal.
    ;(tables[CC_TASKS_TABLE][0] as Record<string, unknown>).status =
      packetStatusToTaskStatus('awaiting_approval')

    const result = await applyPacketTransition(client, FOUNDER, packet.id, { type: 'approve', by: FOUNDER })

    // approve maps to cc running — only the runner may reach running; refused.
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/illegal promotion/)
    const stored = tables[CC_TASKS_TABLE][0] as unknown as CommandCentreTask
    expect(stored.status).toBe('awaiting_approval')
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(0)
  })

  it('applyPacketTransition allows a benign non-promoting transition (running → blocked)', async () => {
    const { client, tables } = makeFakeDb()
    const packet = samplePacket()
    await saveWorkPacket(client, FOUNDER, packet)
    // Force the backing row to 'running' (as if the runner had claimed it).
    ;(tables[CC_TASKS_TABLE][0] as Record<string, unknown>).status = packetStatusToTaskStatus('running')

    const result = await applyPacketTransition(client, FOUNDER, packet.id, { type: 'block' })

    // block targets cc 'blocked' (not queued/running) — passes through unchanged.
    expect(result.ok).toBe(true)
    expect(result.packet?.status).toBe('blocked')
    const stored = tables[CC_TASKS_TABLE][0] as unknown as CommandCentreTask
    expect(stored.status).toBe('blocked')
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(1)
  })

  it('applyPacketTransition refuses completing an approval-required packet and writes nothing', async () => {
    const { client, tables } = makeFakeDb()
    // touchesCrmWrite forces approvalRequired; drive it to running without approval.
    const packet = samplePacket({ touchesCrmWrite: true })
    expect(packet.approvalRequired).toBe(true)

    await saveWorkPacket(client, FOUNDER, packet)
    // Manually move the stored row into 'running' so 'complete' is otherwise allowed.
    ;(tables[CC_TASKS_TABLE][0] as Record<string, unknown>).status = packetStatusToTaskStatus('running')

    const result = await applyPacketTransition(client, FOUNDER, packet.id, { type: 'complete' })

    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/approval required/)
    expect(result.packet?.status).toBe('running') // unchanged in-memory packet
    // No audit event written on a refused transition.
    expect(tables[CC_TASK_EVENTS_TABLE]).toHaveLength(0)
  })

  it('applyPacketTransition returns ok=false, packet=null for a missing packet', async () => {
    const { client } = makeFakeDb()
    const result = await applyPacketTransition(client, FOUNDER, 'nope', { type: 'route' })
    expect(result.ok).toBe(false)
    expect(result.packet).toBeNull()
  })

  it('applyPacketTransition refuses to clobber a status that changed since it was read (UNI-2436 TOCTOU)', async () => {
    // A stale read sees 'running', but the status-guarded write matches ZERO rows
    // (another writer moved the status on). The transition must be refused, not
    // silently applied over the newer status, and nothing may be audited.
    const staleRow: CommandCentreTask = {
      id: 't1',
      founder_id: FOUNDER,
      external_ref: 'pkt-x',
      queue_id: null,
      project_id: null,
      project_key: 'synthex',
      title: 'x',
      objective: 'x',
      priority: 'P2',
      status: 'running',
      agent_owner: null,
      risk_level: 'low',
      execution_mode: 'advisory',
      origin: 'idea',
      dependencies: [],
      human_approval_required: false,
      evidence_path: null,
      validation_required: [],
      linear_id: null,
      preview_url: null,
      metadata: {},
      created_at: '2026-06-16T00:00:00.000Z',
      updated_at: '2026-06-16T00:00:00.000Z',
    }
    let eventInserted = false
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return { single: () => Promise.resolve({ data: staleRow, error: null }) }
                  },
                }
              },
            }
          },
          update() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        // status-guarded write matches zero rows — the race is lost.
                        return { select: () => Promise.resolve({ data: [], error: null }) }
                      },
                    }
                  },
                }
              },
            }
          },
          insert() {
            eventInserted = true
            return {
              select: () => ({ single: () => Promise.resolve({ data: { id: 'e1' }, error: null }) }),
            }
          },
        }
      },
    } as unknown as SupabaseLike

    const result = await applyPacketTransition(client, FOUNDER, 'pkt-x', { type: 'block' })

    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/conflict/)
    expect(result.packet?.status).toBe('running') // unchanged in-memory packet
    expect(eventInserted).toBe(false) // nothing audited on a refused write
  })

  it('persisted metadata contains no secret/key-ish strings', async () => {
    const { client, tables } = makeFakeDb()
    const packet = samplePacket()
    await saveWorkPacket(client, FOUNDER, packet)

    const stored = tables[CC_TASKS_TABLE][0] as Record<string, unknown>
    const serialised = JSON.stringify(stored.metadata).toLowerCase()
    for (const banned of ['secret', 'token', 'password', 'api_key', 'apikey', 'service_role', 'bearer']) {
      expect(serialised).not.toContain(banned)
    }
  })

  it('taskToPacket reconstructs a packet from a raw row', () => {
    const packet = samplePacket()
    const input = packetToCreateTaskInput(packet, FOUNDER)
    const row: CommandCentreTask = {
      id: 'row-1',
      founder_id: FOUNDER,
      external_ref: input.externalRef ?? null,
      queue_id: null,
      project_id: null,
      project_key: input.projectKey ?? null,
      title: input.title,
      objective: input.objective ?? '',
      priority: 'P2',
      status: input.status ?? 'proposed',
      agent_owner: input.agentOwner ?? null,
      risk_level: 'low',
      execution_mode: 'advisory',
      origin: 'idea',
      dependencies: [],
      human_approval_required: input.humanApprovalRequired ?? true,
      evidence_path: input.evidencePath ?? null,
      validation_required: [],
      linear_id: input.linearId ?? null,
      preview_url: null,
      metadata: input.metadata ?? {},
      created_at: '2026-06-16T00:00:00.000Z',
      updated_at: '2026-06-16T00:00:00.000Z',
    }

    const rebuilt = taskToPacket(row)
    expect(rebuilt.id).toBe(packet.id)
    expect(rebuilt.outcome).toBe(packet.outcome)
    expect(rebuilt.lane).toBe(packet.lane)
    expect(rebuilt.status).toBe('draft')
  })
})
