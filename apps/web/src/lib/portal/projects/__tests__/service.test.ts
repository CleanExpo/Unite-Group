import { describe, expect, it, vi } from 'vitest'

import type { PortalAccess } from '../../changes/access'
import { ESTIMATE_NOT_VERIFIED } from '../forecast'
import { loadProjectView, respondToProjectItem, ROW_CAP, submitProjectRequest, type PortalProjectsDb } from '../service'

const OWNER: PortalAccess = { kind: 'ok', owner: { userId: 'u1', tenantSlug: 'acme-demo', aal: 'aal2' } as never }
const NOW = new Date('2026-11-19T00:00:00Z')
const ITEM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const project = (over: Record<string, unknown> = {}) => ({
  id: 'p1', tenant_slug: 'acme-demo', slug: 'demo-erp', name: 'Demo ERP', objective: 'ERP', health: 'on_hold', health_reason: null,
  production_hold: true, hold_reason: 'Owner hold', current_milestone: 'Phase 2 testing', updated_at: '2026-11-18T00:00:00Z', ...over,
})
const item = (over: Record<string, unknown> = {}) => ({
  id: ITEM_ID, project_id: 'p1', tenant_slug: 'acme-demo', kind: 'requirement', title: 'Stock by branch', client_text: 'Stock by branch',
  plain_summary: null, summary_is_ai_proposal: false, state: 'awaiting_client_review', waiting_on: 'client', source: 'portal',
  author_kind: 'client_human', evidence_count: 1, blocker_reason: null, decision_needed: null,
  client_note: null, forecast_window: null, forecast_confidence: null, forecast_basis: null, forecast_updated_at: null,
  created_at: '2026-11-10T00:00:00Z', updated_at: '2026-11-18T00:00:00Z', ...over,
})

function fakeDb(tables: { projects?: unknown; items?: unknown; error?: 'projects' | 'items' }, rpc = vi.fn()) {
  const eqs: string[] = []
  const limits: number[] = []
  const db: PortalProjectsDb = {
    rpc,
    from(table) {
      return {
        select() {
          return {
            eq(_c, v) {
              eqs.push(`${table}:${v}`)
              const order = () => ({ limit: async (n: number) => {
                limits.push(n)
                const isP = table === 'portal_projects'
                if (tables.error === (isP ? 'projects' : 'items')) return { data: null, error: { message: 'boom' } }
                const data = ((isP ? tables.projects : tables.items) ?? []) as unknown[]
                return { data: data.slice(0, n), error: null }
              } })
              return {
                order,
                eq(_c2: string, v2: string) {
                  eqs.push(`${table}:${v2}`)
                  return { order }
                },
              }
            },
          }
        },
      }
    },
  }
  return { db, eqs, rpc, limits }
}

describe('honest lists', () => {
  it('shows the newest items and flags the list as cut when there are more than the cap, never failing or hiding it', async () => {
    const many = Array.from({ length: ROW_CAP + 5 }, (_, n) => item({ id: `i${n}` }))
    const { db, limits } = fakeDb({ projects: [project()], items: many })
    const r = await loadProjectView(OWNER, db, undefined, NOW)
    if (!r.ok || !r.view) throw new Error('expected a view')
    expect(limits).toEqual([ROW_CAP, ROW_CAP + 1])
    expect(r.view.truncated).toBe(true)
    expect(r.view.items).toHaveLength(ROW_CAP)
    expect(r.view.items[0].id).toBe('i0')
  })

  it('does not flag a list of exactly the cap as cut', async () => {
    const exact = Array.from({ length: ROW_CAP }, (_, n) => item({ id: `i${n}` }))
    const r = await loadProjectView(OWNER, fakeDb({ projects: [project()], items: exact }).db, undefined, NOW)
    expect(r.ok && r.view?.truncated).toBe(false)
  })

  it('does not say "waiting on you" once the client has asked for changes and the team owes the next step', async () => {
    const { db } = fakeDb({ projects: [project()], items: [
      item({ id: 'c1', state: 'clarification_required', waiting_on: 'unite' }),
      item({ id: 'c2', state: 'clarification_required', waiting_on: 'client' }),
    ] })
    const r = await loadProjectView(OWNER, db, undefined, NOW)
    if (!r.ok || !r.view) throw new Error('expected a view')
    expect(r.view.waitingOnYou.map((i) => i.id)).toEqual(['c2'])
    expect(r.view.items.find((i) => i.id === 'c1')?.group).toBe('in_progress')
    expect(r.view.items.find((i) => i.id === 'c1')?.actions).toEqual([])
    expect(r.view.items.find((i) => i.id === 'c2')?.actions).toEqual(['answer'])
  })
})

describe('client project view', () => {
  it('refuses a signed-out or aal1 visitor without touching the database', async () => {
    const { db, eqs } = fakeDb({})
    expect(await loadProjectView({ kind: 'sign_in' }, db)).toMatchObject({ ok: false, code: 'sign_in' })
    expect(await loadProjectView({ kind: 'verify_second_factor' }, db)).toMatchObject({ ok: false, code: 'verify_second_factor' })
    expect(eqs).toEqual([])
  })

  it('scopes reads to the owner tenant and drops any row from another tenant or project', async () => {
    const { db, eqs } = fakeDb({
      projects: [project(), project({ id: 'p9', tenant_slug: 'other-co', slug: 'demo-erp' })],
      items: [item(), item({ id: 'x2', tenant_slug: 'other-co' }), item({ id: 'x3', project_id: 'p9' })],
    })
    const r = await loadProjectView(OWNER, db, undefined, NOW)
    expect(eqs).toEqual(['portal_projects:acme-demo', 'portal_project_items:acme-demo', 'portal_project_items:p1'])
    expect(r.ok && r.view?.items.map((i) => i.id)).toEqual([ITEM_ID])
  })

  it('treats a failed read as an error, never as an empty project', async () => {
    expect(await loadProjectView(OWNER, fakeDb({ error: 'projects' }).db)).toMatchObject({ ok: false, code: 'failed' })
    expect(await loadProjectView(OWNER, fakeDb({ projects: [project()], error: 'items' }).db)).toMatchObject({ ok: false, code: 'failed' })
    expect(await loadProjectView(OWNER, fakeDb({ projects: [] }).db)).toEqual({ ok: true, view: null })
  })

  it('groups waiting-on-you, blockers and this week, and never invents a forecast', async () => {
    const { db } = fakeDb({
      projects: [project()],
      items: [
        item(),
        item({ id: 'b1', state: 'blocked', waiting_on: 'third_party', blocker_reason: 'Waiting on access', evidence_count: 0, updated_at: '2026-10-01T00:00:00Z' }),
        item({ id: 'f1', state: 'in_development', forecast_window: 'Week of 1 Dec', forecast_confidence: 'medium', forecast_basis: 'Estimate', forecast_updated_at: '2026-11-18T00:00:00Z' }),
        item({ id: 'bad', state: 'shipped_maybe' }),
      ],
    })
    const r = await loadProjectView(OWNER, db, undefined, NOW)
    if (!r.ok || !r.view) throw new Error('expected a view')
    expect(r.view.items.map((i) => i.id)).toEqual([ITEM_ID, 'b1', 'f1'])
    expect(r.view.waitingOnYou.map((i) => i.id)).toEqual([ITEM_ID])
    expect(r.view.blockers.map((i) => i.id)).toEqual(['b1'])
    expect(r.view.changedThisWeek.map((i) => i.id)).toEqual([ITEM_ID, 'f1'])
    expect(r.view.nextForecast?.id).toBe('f1')
    expect(r.view.items[0].forecast).toEqual({ kind: 'unverified', text: ESTIMATE_NOT_VERIFIED })
    expect(r.view.project.productionHold).toBe(true)
  })
})

describe('client submit and respond', () => {
  it('submits through the database function with the idempotency key, after checking input', async () => {
    const rpc = vi.fn(async () => ({ data: ITEM_ID, error: null }))
    const { db } = fakeDb({}, rpc)
    expect(await submitProjectRequest(OWNER, db, { projectSlug: 'demo-erp', text: 'hi', idempotencyKey: 'key-0000001' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await submitProjectRequest(OWNER, db, { projectSlug: 'demo-erp', text: 'Long enough', idempotencyKey: 'bad key' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(rpc).not.toHaveBeenCalled()
    expect(await submitProjectRequest(OWNER, db, { projectSlug: 'demo-erp', text: '  Show stock by branch ', idempotencyKey: 'key-0000001' })).toEqual({ ok: true, id: ITEM_ID })
    expect(rpc).toHaveBeenCalledWith('portal_submit_project_request', { p_project_slug: 'demo-erp', p_text: 'Show stock by branch', p_idempotency_key: 'key-0000001' })
  })

  it('answers a team question only when the team asked the client, with a note, through the database', async () => {
    const rpc = vi.fn(async () => ({ data: 'proposed', error: null }))
    const { db } = fakeDb({}, rpc)
    const base = { itemId: ITEM_ID, verdict: 'answer', currentState: 'clarification_required' }
    expect(await respondToProjectItem(OWNER, db, { ...base, note: ' ', waitingOn: 'client' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await respondToProjectItem(OWNER, db, { ...base, note: 'Branch 3 only', waitingOn: 'unite' })).toMatchObject({ ok: false, code: 'not_allowed' })
    expect(rpc).not.toHaveBeenCalled()
    expect(await respondToProjectItem(OWNER, db, { ...base, note: 'Branch 3 only', waitingOn: 'client' })).toEqual({ ok: true, state: 'proposed' })
    expect(rpc).toHaveBeenLastCalledWith('portal_respond_to_project_item', { p_item_id: ITEM_ID, p_verdict: 'answer', p_note: 'Branch 3 only' })
  })

  it('accepts or asks for changes only through the database, and needs a note to ask for changes', async () => {
    const rpc = vi.fn(async (_fn: string, args: Record<string, unknown>) => ({
      data: args.p_verdict === 'accept' ? 'client_accepted' : 'clarification_required', error: null,
    }))
    const { db } = fakeDb({}, rpc)
    expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'request_changes', note: ' ', currentState: 'awaiting_client_review' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'approve_release', note: '', currentState: 'awaiting_client_review' })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'accept', note: '', currentState: 'in_development' })).toMatchObject({ ok: false, code: 'not_allowed' })
    expect(rpc).not.toHaveBeenCalled()
    expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'accept', note: '', currentState: 'awaiting_client_review' })).toEqual({ ok: true, state: 'client_accepted' })
    expect(rpc).toHaveBeenLastCalledWith('portal_respond_to_project_item', { p_item_id: ITEM_ID, p_verdict: 'accept', p_note: null })
  })

  it('maps database refusals to plain messages and never reports success on a mismatched answer', async () => {
    for (const [msg, code] of [['portal_wrong_status', 'not_allowed'], ['portal_not_found', 'not_found'], ['portal_not_owner', 'verify_second_factor'], ['other', 'failed']] as const) {
      const { db } = fakeDb({}, vi.fn(async () => ({ data: null, error: { message: msg } })))
      expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'accept', note: '', currentState: 'awaiting_client_review' })).toMatchObject({ ok: false, code })
    }
    const { db } = fakeDb({}, vi.fn(async () => ({ data: 'approved_for_release', error: null })))
    expect(await respondToProjectItem(OWNER, db, { itemId: ITEM_ID, verdict: 'accept', note: '', currentState: 'awaiting_client_review' })).toMatchObject({ ok: false, code: 'failed' })
  })
})
