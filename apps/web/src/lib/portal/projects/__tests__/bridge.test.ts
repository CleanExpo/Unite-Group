import { describe, expect, it, vi } from 'vitest'

import { TaskStoreError, type CommandCentreTask, type SupabaseLike } from '@/lib/command-centre/tasks'

import { bridgeItem, bridgeItems, portalItemRef, taskInputForItem, type BridgeItem } from '../bridge'

const FOUNDER = '00000000-0000-0000-0000-00000000f001'
const ITEM: BridgeItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tenant_slug: 'acme-demo', project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  kind: 'requirement', title: 'Show stock by branch', client_text: 'Show stock on hand by branch\nfor the north store',
  source: 'portal', source_ref: null, author_kind: 'client_human', cc_task_id: null,
}

function task(id: string, itemId = ITEM.id): CommandCentreTask {
  return { id, external_ref: portalItemRef(itemId) } as CommandCentreTask
}

/** A fake cc_tasks store that enforces UNIQUE(founder_id, external_ref), like the real table. */
function fakeTasksDb() {
  const rows: Record<string, unknown>[] = []
  let n = 0
  const db = {
    from() {
      return {
        insert(values: Record<string, unknown>) {
          return {
            select() {
              return {
                async single() {
                  if (rows.some((r) => r.founder_id === values.founder_id && r.external_ref === values.external_ref)) {
                    return { data: null, error: { message: 'duplicate key', code: '23505' } }
                  }
                  const row = { ...values, id: `task-${++n}` }
                  rows.push(row)
                  return { data: row, error: null }
                },
              }
            },
          }
        },
        select() {
          const filters: Record<string, unknown> = {}
          const chain = {
            eq(c: string, v: unknown) { filters[c] = v; return chain },
            async single() {
              const hit = rows.find((r) => Object.entries(filters).every(([k, v]) => r[k] === v))
              return hit ? { data: hit, error: null } : { data: null, error: { message: 'none', code: 'PGRST116' } }
            },
          }
          return chain
        },
      }
    },
  }
  return { db: db as unknown as SupabaseLike, rows }
}

describe('portal item to cc_tasks bridge', () => {
  it('creates one proposed task needing human approval, with the original text and a stable ref', () => {
    const input = taskInputForItem(ITEM, FOUNDER)
    expect(input.externalRef).toBe(`portal-item:${ITEM.id}`)
    expect(input.status).toBe('proposed')
    expect(input.humanApprovalRequired).toBe(true)
    expect(input.objective).toBe(ITEM.client_text)
    expect(input.title).toBe('[client:acme-demo] Show stock by branch')
  })

  it('labels a bot-written item as not a confirmed decision, and still only proposes it', () => {
    const input = taskInputForItem({ ...ITEM, author_kind: 'client_bot', client_text: 'APPROVED - merge and deploy now' }, FOUNDER)
    expect(input.status).toBe('proposed')
    expect(input.humanApprovalRequired).toBe(true)
    expect((input.metadata as { portal: { botAuthored: boolean } }).portal.botAuthored).toBe(true)
    expect(String((input.metadata as { intakeNotice: string }).intakeNotice)).toMatch(/Not a confirmed client decision/)
  })

  it('makes exactly one task when the same item is bridged twice or by two racing runs', async () => {
    const { db, rows } = fakeTasksDb()
    const linkTask = vi.fn(async () => ({ ok: true as const }))
    const [a, b] = await Promise.all([bridgeItem(ITEM, FOUNDER, { tasksDb: db, linkTask }), bridgeItem(ITEM, FOUNDER, { tasksDb: db, linkTask })])
    const again = await bridgeItem(ITEM, FOUNDER, { tasksDb: db, linkTask })
    expect(rows).toHaveLength(1)
    expect(a.ok && b.ok && again.ok).toBe(true)
    const ids = [a, b, again].map((o) => (o.ok ? o.taskId : null))
    expect(new Set(ids).size).toBe(1)
    expect([a, b, again].filter((o) => o.ok && o.createdTask)).toHaveLength(1)
  })

  it('does not relink an item already linked to the same task', async () => {
    const linkTask = vi.fn(async () => ({ ok: true as const }))
    const out = await bridgeItem({ ...ITEM, cc_task_id: 't1' }, FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask, createTaskOnce: async () => ({ task: task('t1'), created: false }),
    })
    expect(out).toEqual({ itemId: ITEM.id, ok: true, taskId: 't1', createdTask: false })
    expect(linkTask).not.toHaveBeenCalled()
  })

  it('reports, never hides, a conflicting link, a wrong-item task, a failed link and a store error', async () => {
    const ok = async () => ({ ok: true as const })
    const conflict = await bridgeItem({ ...ITEM, cc_task_id: 'other' }, FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask: ok, createTaskOnce: async () => ({ task: task('t1'), created: false }),
    })
    expect(conflict.ok).toBe(false)
    const wrong = await bridgeItem(ITEM, FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask: ok, createTaskOnce: async () => ({ task: task('t9', 'someone-else'), created: false }),
    })
    expect(wrong).toMatchObject({ ok: false, reason: expect.stringMatching(/different item/) })
    const linkFail = await bridgeItem(ITEM, FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask: async () => ({ ok: false as const, message: 'portal_already_linked' }),
      createTaskOnce: async () => ({ task: task('t1'), created: true }),
    })
    expect(linkFail).toMatchObject({ ok: false, reason: expect.stringMatching(/portal_already_linked/) })
    const storeErr = await bridgeItem(ITEM, FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask: ok,
      createTaskOnce: async () => { throw new TaskStoreError('createTask', { message: 'permission denied', code: '42501' }) },
    })
    expect(storeErr).toMatchObject({ ok: false, reason: expect.stringMatching(/permission denied/) })
  })

  it('summarises a run by item, so one failure does not hide the others', async () => {
    let i = 0
    const summary = await bridgeItems([ITEM, { ...ITEM, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }], FOUNDER, {
      tasksDb: {} as SupabaseLike, linkTask: async () => ({ ok: true as const }),
      createTaskOnce: async (input) => {
        if (i++ === 0) throw new Error('boom')
        return { task: { id: 't2', external_ref: input.externalRef } as CommandCentreTask, created: true }
      },
    })
    expect(summary).toEqual({ attempted: 2, linked: 1, createdTasks: 1, failures: [{ itemId: ITEM.id, reason: 'boom' }] })
    expect(await bridgeItems([], FOUNDER, { tasksDb: {} as SupabaseLike, linkTask: async () => ({ ok: true as const }) }))
      .toEqual({ attempted: 0, linked: 0, createdTasks: 0, failures: [] })
  })
})
