// src/lib/command-centre/overnight-summary.ts
//
// CC-19 — Overnight summary / morning digest. A pure synthesis of the command
// centre's state (tasks + execution sessions) into a one-screen briefing for the
// morning, plus a gather accessor that reads the data and builds it.
//
// Read-only: no writes, no execution. The cron route persists the digest as a
// wiki daily note; the API/UI render it. No remote calls at import time.

import { listTasks, type CommandCentreTask, type TaskStatus, type SupabaseLike } from './tasks'
import { listRecentSessions, type ExecutionSession, type SessionStatus } from './sessions'
import { createClient } from '@/lib/supabase/server'
import { buildOpportunityForecast, type CrmOpportunityForecastRow } from '@/lib/crm/opportunity-forecast'

const TASK_STATUSES: readonly TaskStatus[] = [
  'proposed', 'queued', 'running', 'blocked', 'awaiting_approval', 'done', 'failed',
]
const SESSION_STATUSES: readonly SessionStatus[] = ['running', 'paused', 'done', 'failed']

export interface OvernightDigest {
  generatedAt: string
  tasks: {
    total: number
    byStatus: Record<TaskStatus, number>
    needsDecision: number // proposed + awaiting_approval
    approvalGatedBlocked: number
    queued: number
    blocked: number
    failed: number
    done: number
  }
  sessions: {
    total: number
    byStatus: Record<SessionStatus, number>
  }
  /** Human-readable action items, most important first. Empty ⇒ nothing needs you. */
  attention: string[]
  /** One-line summary for the top of the dashboard / the daily note title. */
  headline: string
  /** Optional CRM read-surface signals. Decision support only; not conversion/execution authority. */
  crm?: OvernightCrmSignals
}

export type OvernightCrmSignalsInput = OvernightCrmMetricSignalsInput | OvernightCrmUnavailableInput

export interface OvernightCrmMetricSignalsInput {
  status?: 'ok'
  leads?: {
    newCount?: number
    needsReviewCount?: number
  }
  opportunities?: {
    approvalGatedCount?: number
    weightedForecast?: OvernightWeightedForecastInput
  }
  window: OvernightCrmWindowInput
}

export interface OvernightWeightedForecastInput {
  status: 'available' | 'unavailable'
  totalsByCurrency?: Array<{ currency?: string; amount?: number }>
  reason?: 'currency_missing_or_invalid'
}

export interface OvernightCrmWindowInput {
  limit: number
  leadsReturned: number
  opportunitiesReturned: number
}

export interface OvernightCrmUnavailableInput {
  status: 'unavailable'
  reason: 'read_failed'
}

export type OvernightCrmSignals = OvernightCrmMetricSignals | OvernightCrmUnavailableSignals

export interface OvernightCrmMetricSignals {
  source: 'crm:read-surface-signals'
  status?: 'ok'
  leads: {
    newCount: number
    needsReviewCount: number
  }
  opportunities: {
    approvalGatedCount: number
    weightedForecast: OvernightWeightedForecast
  }
  window: OvernightCrmWindow
}

export type OvernightWeightedForecast =
  | { status: 'available'; totalsByCurrency: Array<{ currency: string; amount: number }> }
  | { status: 'unavailable'; reason: 'currency_missing_or_invalid' }

export interface OvernightCrmWindow {
  kind: 'latest-window'
  limit: number
  leadsReturned: number
  opportunitiesReturned: number
  leadsMayBeTruncated: boolean
  opportunitiesMayBeTruncated: boolean
}

export interface OvernightCrmUnavailableSignals {
  source: 'crm:read-surface-signals'
  status: 'unavailable'
  reason: 'read_failed'
}

function zero<T extends string>(keys: readonly T[]): Record<T, number> {
  return keys.reduce((acc, k) => { acc[k] = 0; return acc }, {} as Record<T, number>)
}

function safeCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function safeAmount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function safeCurrency(value: string | undefined): string | null {
  const currency = value?.trim().toUpperCase()
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null
}

function normaliseWeightedForecast(input?: OvernightWeightedForecastInput): OvernightWeightedForecast {
  if (!input || input.status === 'unavailable') {
    return { status: 'unavailable', reason: 'currency_missing_or_invalid' }
  }

  const totals = new Map<string, number>()
  for (const total of input.totalsByCurrency ?? []) {
    const currency = safeCurrency(total.currency)
    if (!currency) return { status: 'unavailable', reason: 'currency_missing_or_invalid' }
    totals.set(currency, safeAmount(total.amount) + (totals.get(currency) ?? 0))
  }

  return {
    status: 'available',
    totalsByCurrency: [...totals.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
  }
}

function normaliseWindow(input: OvernightCrmWindowInput): OvernightCrmWindow {
  const limit = Math.max(1, safeCount(input.limit))
  const leadsReturned = Math.min(limit, safeCount(input.leadsReturned))
  const opportunitiesReturned = Math.min(limit, safeCount(input.opportunitiesReturned))
  return {
    kind: 'latest-window',
    limit,
    leadsReturned,
    opportunitiesReturned,
    leadsMayBeTruncated: leadsReturned === limit,
    opportunitiesMayBeTruncated: opportunitiesReturned === limit,
  }
}

function isUnavailableCrmInput(input: OvernightCrmSignalsInput): input is OvernightCrmUnavailableInput {
  return 'status' in input && input.status === 'unavailable'
}

function isUnavailableCrmSignals(crm: OvernightCrmSignals): crm is OvernightCrmUnavailableSignals {
  return 'status' in crm && crm.status === 'unavailable'
}

function isMetricCrmSignals(crm: OvernightCrmSignals): crm is OvernightCrmMetricSignals {
  return 'leads' in crm
}

function normaliseCrmSignals(input?: OvernightCrmSignalsInput): OvernightCrmSignals | undefined {
  if (!input) return undefined
  if (isUnavailableCrmInput(input)) {
    return {
      source: 'crm:read-surface-signals',
      status: 'unavailable',
      reason: 'read_failed',
    }
  }
  return {
    source: 'crm:read-surface-signals',
    leads: {
      newCount: safeCount(input.leads?.newCount),
      needsReviewCount: safeCount(input.leads?.needsReviewCount),
    },
    opportunities: {
      approvalGatedCount: safeCount(input.opportunities?.approvalGatedCount),
      weightedForecast: normaliseWeightedForecast(input.opportunities?.weightedForecast),
    },
    window: normaliseWindow(input.window),
  }
}

type CrmLeadSignalRow = { status?: string | null }

type CrmReadSurfaceClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        order(column: string, options?: { ascending?: boolean }): {
          limit(limit: number): Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }
  }
}

const REVIEWABLE_LEAD_STATUSES = new Set(['new', 'qualified', 'nurture'])
const CRM_READ_LIMIT = 500

async function readCrmSignals(founderId: string, db: CrmReadSurfaceClient): Promise<OvernightCrmSignalsInput | undefined> {
  try {
    const [leadsRead, opportunitiesRead] = await Promise.all([
      db
        .from('crm_leads')
        .select('status')
        .eq('founder_id', founderId)
        .order('captured_at', { ascending: false })
        .limit(CRM_READ_LIMIT),
      db
        .from('crm_opportunities')
        .select('id,name,stage,status,value_amount,value_currency,probability,expected_close_at,approval_required,approval_status,next_action')
        .eq('founder_id', founderId)
        .order('created_at', { ascending: false })
        .limit(CRM_READ_LIMIT),
    ])

    if (leadsRead.error || opportunitiesRead.error) return { status: 'unavailable', reason: 'read_failed' }

    const leads = (leadsRead.data ?? []) as CrmLeadSignalRow[]
    const opportunityRows = (opportunitiesRead.data ?? []) as CrmOpportunityForecastRow[]
    const forecast = buildOpportunityForecast(opportunityRows)
    const currencyUnavailable = opportunityRows.some((row) => safeCurrency(row.value_currency ?? undefined) === null)
    const totalsByCurrency = new Map<string, number>()
    if (!currencyUnavailable) {
      for (const bucket of forecast.buckets) {
        totalsByCurrency.set(bucket.currency, (totalsByCurrency.get(bucket.currency) ?? 0) + bucket.weightedValue)
      }
    }

    return {
      leads: {
        newCount: leads.filter((lead) => lead.status === 'new').length,
        needsReviewCount: leads.filter((lead) => REVIEWABLE_LEAD_STATUSES.has(String(lead.status))).length,
      },
      opportunities: {
        approvalGatedCount: forecast.approvalGated.length,
        weightedForecast: currencyUnavailable
          ? { status: 'unavailable', reason: 'currency_missing_or_invalid' }
          : {
            status: 'available',
            totalsByCurrency: [...totalsByCurrency.entries()].map(([currency, amount]) => ({ currency, amount })),
          },
      },
      window: {
        limit: CRM_READ_LIMIT,
        leadsReturned: leads.length,
        opportunitiesReturned: opportunityRows.length,
      },
    }
  } catch {
    return { status: 'unavailable', reason: 'read_failed' }
  }
}

/** Pure builder — deterministic given its inputs (generatedAt is passed in). */
export function buildOvernightDigest(
  tasks: CommandCentreTask[],
  sessions: ExecutionSession[],
  generatedAt: string,
  crmInput?: OvernightCrmSignalsInput,
): OvernightDigest {
  const byStatus = zero(TASK_STATUSES)
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status] += 1
  }
  const sByStatus = zero(SESSION_STATUSES)
  for (const s of sessions) {
    if (s.status in sByStatus) sByStatus[s.status] += 1
  }

  const needsDecision = byStatus.proposed + byStatus.awaiting_approval
  const approvalGatedBlocked = tasks.filter((task) => task.status === 'blocked' && task.human_approval_required).length
  const blocked = byStatus.blocked
  const failed = byStatus.failed
  const done = byStatus.done
  const queued = byStatus.queued
  const crm = normaliseCrmSignals(crmInput)
  const crmMetrics: OvernightCrmMetricSignals | null = crm && isMetricCrmSignals(crm) ? crm : null
  const crmUnavailable = crm && isUnavailableCrmSignals(crm)

  const attention: string[] = []
  if (needsDecision > 0) attention.push(`${needsDecision} task${needsDecision === 1 ? '' : 's'} awaiting your decision`)
  if (approvalGatedBlocked > 0) attention.push(`${approvalGatedBlocked} approval-gated task${approvalGatedBlocked === 1 ? '' : 's'} blocked`)
  const otherBlocked = Math.max(0, blocked - approvalGatedBlocked)
  if (otherBlocked > 0) attention.push(`${otherBlocked} task${otherBlocked === 1 ? '' : 's'} blocked`)
  if (crmUnavailable) {
    attention.push('CRM read surface unavailable — check lead/opportunity sync before decisions')
  }
  if (crmMetrics && crmMetrics.leads.newCount > 0) attention.push(`${crmMetrics.leads.newCount} new CRM lead${crmMetrics.leads.newCount === 1 ? '' : 's'} to review in latest window`)
  if (crmMetrics && crmMetrics.leads.newCount === 0 && crmMetrics.leads.needsReviewCount > 0) {
    attention.push(`${crmMetrics.leads.needsReviewCount} CRM lead${crmMetrics.leads.needsReviewCount === 1 ? '' : 's'} need review in latest window`)
  }
  if (crmMetrics && crmMetrics.opportunities.approvalGatedCount > 0) {
    attention.push(`${crmMetrics.opportunities.approvalGatedCount} approval-gated opportunit${crmMetrics.opportunities.approvalGatedCount === 1 ? 'y' : 'ies'} need${crmMetrics.opportunities.approvalGatedCount === 1 ? 's' : ''} decision in latest window`)
  }
  if (sByStatus.failed > 0) attention.push(`${sByStatus.failed} session${sByStatus.failed === 1 ? '' : 's'} failed overnight`)
  if (failed > 0) attention.push(`${failed} task${failed === 1 ? '' : 's'} failed`)
  if (sByStatus.paused > 0) attention.push(`${sByStatus.paused} session${sByStatus.paused === 1 ? '' : 's'} paused`)

  const crmHeadline = crmMetrics && crmMetrics.leads.newCount > 0
    ? `${crmMetrics.leads.newCount} CRM lead${crmMetrics.leads.newCount === 1 ? '' : 's'} in latest window`
    : crmMetrics && crmMetrics.leads.needsReviewCount > 0
      ? `${crmMetrics.leads.needsReviewCount} CRM review${crmMetrics.leads.needsReviewCount === 1 ? '' : 's'} in latest window`
      : null
  const headline =
    tasks.length === 0 && !crmHeadline
      ? 'No tasks in the queue yet — capture an idea to begin.'
      : [crmHeadline, `${queued} queued`, `${needsDecision} need you`, `${sessions.length} session${sessions.length === 1 ? '' : 's'}`, `${done} done`]
        .filter(Boolean)
        .join(' · ')

  return {
    generatedAt,
    tasks: { total: tasks.length, byStatus, needsDecision, approvalGatedBlocked, queued, blocked, failed, done },
    sessions: { total: sessions.length, byStatus: sByStatus },
    attention,
    headline,
    ...(crm ? { crm } : {}),
  }
}

/** Read founder-scoped tasks + recent sessions and build the digest. */
export async function gatherOvernightDigest(
  input: { founderId: string; generatedAt: string },
  client?: SupabaseLike,
): Promise<OvernightDigest> {
  const db: SupabaseLike = client ?? ((await createClient()) as unknown as SupabaseLike)
  const [tasks, sessions, crmSignals] = await Promise.all([
    listTasks({ founderId: input.founderId, limit: 100 }, db),
    listRecentSessions({ founderId: input.founderId, limit: 200 }, db),
    readCrmSignals(input.founderId, db as unknown as CrmReadSurfaceClient),
  ])
  return buildOvernightDigest(tasks, sessions, input.generatedAt, crmSignals)
}

/** Render the digest as a markdown body for the wiki daily note. */
export function digestToMarkdown(digest: OvernightDigest): string {
  const lines: string[] = []
  lines.push(`## Morning digest`, '', digest.headline, '')
  if (digest.attention.length > 0) {
    lines.push('### Needs your attention')
    for (const a of digest.attention) lines.push(`- ${a}`)
    lines.push('')
  } else {
    lines.push('Nothing needs your attention — the board is clear.', '')
  }
  if (digest.crm) {
    const crm = digest.crm
    lines.push('### CRM read surface')
    lines.push(`- Source: ${crm.source}`)
    if (isUnavailableCrmSignals(crm)) {
      lines.push('- Status: unavailable')
      lines.push('- Reason: read_failed')
      lines.push('- Guardrail: no CRM approvals, conversions, billing, or outreach should use this degraded digest')
    } else if (isMetricCrmSignals(crm)) {
      lines.push(`- Scope: latest-window limit ${crm.window.limit} per CRM table; leads returned ${crm.window.leadsReturned}; opportunities returned ${crm.window.opportunitiesReturned}`)
      lines.push(`- Window may be truncated: leads ${crm.window.leadsMayBeTruncated ? 'yes' : 'no'}; opportunities ${crm.window.opportunitiesMayBeTruncated ? 'yes' : 'no'}`)
      lines.push(`- New CRM leads in latest window: ${crm.leads.newCount}`)
      lines.push(`- CRM leads needing review in latest window: ${crm.leads.needsReviewCount}`)
      lines.push(`- Approval-gated opportunities in latest window: ${crm.opportunities.approvalGatedCount}`)
      if (crm.opportunities.weightedForecast.status === 'available') {
        for (const total of crm.opportunities.weightedForecast.totalsByCurrency) {
          lines.push(`- Weighted opportunity forecast in latest window (${total.currency}): ${total.amount}`)
        }
      } else {
        lines.push('- Weighted opportunity forecast: unavailable (currency missing or invalid)')
      }
      lines.push('- Guardrail: CRM read-surface metrics are decision support only; no approvals, conversions, billing, or outreach are executed from this digest')
    }
    lines.push('')
  }
  lines.push('### Tasks')
  for (const [status, n] of Object.entries(digest.tasks.byStatus)) {
    if (n > 0) lines.push(`- ${status}: ${n}`)
  }
  lines.push('', '### Sessions')
  for (const [status, n] of Object.entries(digest.sessions.byStatus)) {
    if (n > 0) lines.push(`- ${status}: ${n}`)
  }
  return lines.join('\n')
}
