import { deniedResult, type ActionDenied, type PortalAccess } from '../changes/access'

import { forecastView, type ForecastView } from './forecast'
import {
  clientCanRespond, isItemKind, isItemState, stateGroup,
  type AuthorKind, type ItemKind, type ItemState, type StateGroup,
} from './state'

// Owner actions on the client project page. Same shape as lib/portal/changes/service.ts:
//   1. refuse unless the session is a signed-in owner at aal2 (decidePortalAccess);
//   2. scope every read to her tenant in code, on top of the row rules;
//   3. write only through a database function, which re-checks tenant, aal2 and state and writes the audit event.

type DbError = { message: string; code?: string } | null
type Result<T> = PromiseLike<{ data: T; error: DbError }>

/** The slice of the Supabase client these functions use. Structural so tests can pass a fake. */
export interface PortalProjectsDb {
  rpc(fn: string, args: Record<string, unknown>): Result<unknown>
  from(table: 'portal_projects' | 'portal_project_items'): {
    select(columns: string): {
      eq(column: 'tenant_slug', value: string): {
        order(column: 'created_at' | 'updated_at', options: { ascending: boolean }): Result<unknown>
      }
    }
  }
}

export type ActionFailed = { ok: false; code: 'invalid' | 'not_allowed' | 'not_found' | 'failed'; message: string }
export type ActionResult<T> = ({ ok: true } & T) | ActionDenied | ActionFailed

export type ProjectHealth = 'on_track' | 'at_risk' | 'blocked' | 'on_hold' | 'unknown'

export interface ProjectSummary {
  id: string; slug: string; name: string; objective: string | null; health: ProjectHealth; healthReason: string | null
  productionHold: boolean; holdReason: string | null; currentMilestone: string | null; updatedAt: string
}

export interface ProjectItem {
  id: string; projectId: string; kind: ItemKind; title: string; clientText: string | null; plainSummary: string | null
  summaryIsAiProposal: boolean; state: ItemState; group: StateGroup; waitingOn: 'client' | 'unite' | 'third_party' | 'none'
  authorKind: AuthorKind; source: string; linkedToTask: boolean; evidenceCount: number; blockerReason: string | null
  decisionNeeded: string | null; clientNote: string | null; forecast: ForecastView; createdAt: string; updatedAt: string
}

export interface ProjectView {
  project: ProjectSummary
  items: ProjectItem[]
  waitingOnYou: ProjectItem[]
  blockers: ProjectItem[]
  changedThisWeek: ProjectItem[]
  nextForecast: ProjectItem | null
}

const PROJECT_COLUMNS = 'id, tenant_slug, slug, name, objective, health, health_reason, production_hold, hold_reason, current_milestone, updated_at'
const ITEM_COLUMNS = 'id, project_id, tenant_slug, kind, title, client_text, plain_summary, summary_is_ai_proposal, state, waiting_on, '
  + 'source, author_kind, cc_task_id, evidence, blocker_reason, decision_needed, client_note, forecast_window, forecast_confidence, '
  + 'forecast_basis, forecast_updated_at, created_at, updated_at'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/
const SLUG_RE = /^[a-z0-9-]{1,64}$/
const HEALTH: readonly ProjectHealth[] = ['on_track', 'at_risk', 'blocked', 'on_hold', 'unknown']
const AUTHORS: readonly AuthorKind[] = ['client_human', 'client_bot', 'staff', 'agent']
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type ProjectRow = {
  id: string; tenant_slug: string; slug: string; name: string; objective: string | null; health: string
  health_reason: string | null; production_hold: boolean; hold_reason: string | null; current_milestone: string | null; updated_at: string
}
type ItemRow = {
  id: string; project_id: string; tenant_slug: string; kind: string; title: string; client_text: string | null
  plain_summary: string | null; summary_is_ai_proposal: boolean; state: string; waiting_on: string; source: string
  author_kind: string; cc_task_id: string | null; evidence: unknown; blocker_reason: string | null; decision_needed: string | null
  client_note: string | null; forecast_window: string | null; forecast_confidence: string | null; forecast_basis: string | null
  forecast_updated_at: string | null; created_at: string; updated_at: string
}

function toProject(row: ProjectRow): ProjectSummary {
  return {
    id: row.id, slug: row.slug, name: row.name, objective: row.objective,
    health: HEALTH.includes(row.health as ProjectHealth) ? (row.health as ProjectHealth) : 'unknown',
    healthReason: row.health_reason, productionHold: row.production_hold === true, holdReason: row.hold_reason,
    currentMilestone: row.current_milestone, updatedAt: row.updated_at,
  }
}

/** Rows with an unknown state, kind or author are dropped, never shown with a guessed label. */
function toItem(row: ItemRow, now: Date): ProjectItem | null {
  if (!isItemState(row.state) || !isItemKind(row.kind) || !AUTHORS.includes(row.author_kind as AuthorKind)) return null
  const confidence = row.forecast_confidence === 'low' || row.forecast_confidence === 'medium' || row.forecast_confidence === 'high'
    ? row.forecast_confidence : null
  return {
    id: row.id, projectId: row.project_id, kind: row.kind, title: row.title, clientText: row.client_text,
    plainSummary: row.plain_summary, summaryIsAiProposal: row.summary_is_ai_proposal === true, state: row.state,
    group: stateGroup(row.state),
    waitingOn: (['client', 'unite', 'third_party', 'none'] as const).find((w) => w === row.waiting_on) ?? 'unite',
    authorKind: row.author_kind as AuthorKind, source: row.source, linkedToTask: typeof row.cc_task_id === 'string',
    evidenceCount: Array.isArray(row.evidence) ? row.evidence.length : 0, blockerReason: row.blocker_reason,
    decisionNeeded: row.decision_needed, clientNote: row.client_note,
    forecast: forecastView({ window: row.forecast_window, basis: row.forecast_basis, confidence, updatedAt: row.forecast_updated_at }, now),
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

/**
 * The client's project page. A failed read is an error, never an empty project.
 * With no slug, the tenant's oldest project is shown (one project per client today).
 */
export async function loadProjectView(
  access: PortalAccess, db: PortalProjectsDb, projectSlug?: string, now: Date = new Date(),
): Promise<ActionResult<{ view: ProjectView | null }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const tenant = access.owner.tenantSlug
  const failed: ActionFailed = { ok: false, code: 'failed', message: 'We could not load your project. Please refresh.' }
  const p = await db.from('portal_projects').select(PROJECT_COLUMNS).eq('tenant_slug', tenant).order('created_at', { ascending: true })
  if (p.error || !Array.isArray(p.data)) return failed
  const projects = (p.data as ProjectRow[]).filter((r) => r.tenant_slug === tenant)
  const row = projectSlug ? projects.find((r) => r.slug === projectSlug) : projects[0]
  if (!row) return { ok: true, view: null }
  const i = await db.from('portal_project_items').select(ITEM_COLUMNS).eq('tenant_slug', tenant).order('updated_at', { ascending: false })
  if (i.error || !Array.isArray(i.data)) return failed
  const items = (i.data as ItemRow[])
    .filter((r) => r.tenant_slug === tenant && r.project_id === row.id)
    .map((r) => toItem(r, now))
    .filter((x): x is ProjectItem => x !== null)
  const forecasted = items.filter((x) => x.forecast.kind === 'forecast' && x.group !== 'released')
  return {
    ok: true,
    view: {
      project: toProject(row),
      items,
      waitingOnYou: items.filter((x) => x.group === 'waiting_on_you'),
      blockers: items.filter((x) => x.group === 'blocked'),
      changedThisWeek: items.filter((x) => now.getTime() - Date.parse(x.updatedAt) <= WEEK_MS),
      nextForecast: forecasted[0] ?? null,
    },
  }
}

export async function submitProjectRequest(
  access: PortalAccess, db: PortalProjectsDb, input: { projectSlug: unknown; text: unknown; idempotencyKey: unknown },
): Promise<ActionResult<{ id: string }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (text.length < 5 || text.length > 4000) return { ok: false, code: 'invalid', message: 'Please describe your request in 5 to 4000 characters.' }
  if (typeof input.projectSlug !== 'string' || !SLUG_RE.test(input.projectSlug)) return { ok: false, code: 'not_found', message: 'We could not find that project.' }
  if (typeof input.idempotencyKey !== 'string' || !KEY_RE.test(input.idempotencyKey)) return { ok: false, code: 'invalid', message: 'Please refresh the page and try again.' }
  const { data, error } = await db.rpc('portal_submit_project_request', {
    p_project_slug: input.projectSlug, p_text: text, p_idempotency_key: input.idempotencyKey,
  })
  if (error || typeof data !== 'string') return fromDbError(error)
  return { ok: true, id: data }
}

export async function respondToProjectItem(
  access: PortalAccess, db: PortalProjectsDb, input: { itemId: unknown; verdict: unknown; note: unknown; currentState: unknown },
): Promise<ActionResult<{ state: ItemState }>> {
  if (access.kind !== 'ok') return deniedResult(access)
  if (typeof input.itemId !== 'string' || !UUID_RE.test(input.itemId)) return { ok: false, code: 'not_found', message: 'We could not find that item.' }
  if (input.verdict !== 'accept' && input.verdict !== 'request_changes') return { ok: false, code: 'invalid', message: 'Please choose Accept or Ask for changes.' }
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  if (input.verdict === 'request_changes' && (note.length < 1 || note.length > 1000)) {
    return { ok: false, code: 'invalid', message: 'Please say what should change (up to 1000 characters).' }
  }
  if (note.length > 1000) return { ok: false, code: 'invalid', message: 'Please keep your note under 1000 characters.' }
  // Friendly early answer only; the database function is the real check.
  if (isItemState(input.currentState) && !clientCanRespond(input.currentState)) {
    return { ok: false, code: 'not_allowed', message: 'This item is not waiting for your review.' }
  }
  const want: ItemState = input.verdict === 'accept' ? 'client_accepted' : 'clarification_required'
  const { data, error } = await db.rpc('portal_respond_to_project_item', {
    p_item_id: input.itemId, p_verdict: input.verdict, p_note: note || null,
  })
  if (error || data !== want) return fromDbError(error)
  return { ok: true, state: want }
}

function fromDbError(error: DbError): ActionFailed | ActionDenied {
  const m = error?.message ?? ''
  if (m.includes('portal_not_owner')) return { ok: false, code: 'verify_second_factor', message: 'Please confirm it is you with your second sign-in step first.' }
  if (m.includes('portal_wrong_status')) return { ok: false, code: 'not_allowed', message: 'This item is not waiting for your review.' }
  if (m.includes('portal_not_found')) return { ok: false, code: 'not_found', message: 'We could not find that item.' }
  if (m.includes('portal_rate_limited')) return { ok: false, code: 'not_allowed', message: 'You have sent a lot of requests today. Please try again tomorrow.' }
  if (m.includes('portal_bad_input')) return { ok: false, code: 'invalid', message: 'Please check what you entered and try again.' }
  return { ok: false, code: 'failed', message: 'Something went wrong. Please try again.' }
}
