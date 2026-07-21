import { describe, it, expect } from 'vitest'
import { buildOvernightDigest, digestToMarkdown, gatherOvernightDigest } from '@/lib/command-centre/overnight-summary'
import type { CommandCentreTask, TaskStatus } from '@/lib/command-centre/tasks'
import type { ExecutionSession, SessionStatus } from '@/lib/command-centre/sessions'

function task(status: TaskStatus, overrides: Partial<CommandCentreTask> = {}): CommandCentreTask {
  return {
    id: 't', founder_id: 'f', external_ref: null, queue_id: null, project_id: null, project_key: null,
    title: 'x', objective: '', priority: 'P2', status, agent_owner: null, risk_level: 'low',
    execution_mode: 'advisory', origin: 'idea', dependencies: [], human_approval_required: true,
    evidence_path: null, validation_required: [], linear_id: null, preview_url: null, metadata: {},
    created_at: 'now', updated_at: 'now',
    ...overrides,
  }
}
function sess(status: SessionStatus): ExecutionSession {
  return { id: 's', founder_id: 'f', task_id: 't', surface: 'local', status, logs_ref: null, started_at: 'now', ended_at: null }
}

type SupabaseReadRow = Record<string, unknown>

function readOnlySupabase(
  rowsByTable: Record<string, SupabaseReadRow[]>,
  calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [],
  errorsByTable: Record<string, string> = {},
) {
  return {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> }
      calls.push(call)
      let rows = rowsByTable[table] ?? []
      const query = {
        select() { return query },
        eq(column: string, value: unknown) {
          call.filters.push([column, value])
          rows = rows.filter((row) => row[column] === value)
          return query
        },
        order() { return query },
        limit(limit: number) {
          const errorMessage = errorsByTable[table]
          return Promise.resolve({
            data: errorMessage ? null : rows.slice(0, limit),
            error: errorMessage ? { message: errorMessage } : null,
          })
        },
      }
      return query
    },
  }
}

const AT = '2026-06-09T19:30:00Z'
const WINDOW = { limit: 500, leadsReturned: 0, opportunitiesReturned: 0 }

describe('buildOvernightDigest', () => {
  it('counts tasks by status and computes needsDecision', () => {
    const tasks = [task('proposed'), task('awaiting_approval'), task('queued'), task('queued'), task('done')]
    const d = buildOvernightDigest(tasks, [], AT)
    expect(d.tasks.total).toBe(5)
    expect(d.tasks.byStatus.queued).toBe(2)
    expect(d.tasks.needsDecision).toBe(2) // proposed + awaiting_approval
    expect(d.tasks.done).toBe(1)
    expect(d.generatedAt).toBe(AT)
  })

  it('summarises sessions by status', () => {
    const d = buildOvernightDigest([], [sess('running'), sess('failed'), sess('failed'), sess('done')], AT)
    expect(d.sessions.total).toBe(4)
    expect(d.sessions.byStatus.failed).toBe(2)
    expect(d.sessions.byStatus.running).toBe(1)
  })

  it('surfaces attention items (decisions, blocked, failed sessions)', () => {
    const tasks = [task('proposed'), task('blocked', { human_approval_required: false })]
    const d = buildOvernightDigest(tasks, [sess('failed')], AT)
    expect(d.attention).toContain('1 task awaiting your decision')
    expect(d.attention).toContain('1 task blocked')
    expect(d.attention).toContain('1 session failed overnight')
  })

  it('surfaces approval-gated blocked tasks distinctly for CRM decisions', () => {
    const tasks = [
      task('blocked', { title: 'Approve lead conversion', human_approval_required: true }),
      task('blocked', { title: 'Investigate flaky CI', human_approval_required: false }),
    ]

    const d = buildOvernightDigest(tasks, [], AT)

    expect(d.tasks.approvalGatedBlocked).toBe(1)
    expect(d.attention).toContain('1 approval-gated task blocked')
    expect(d.attention).toContain('1 task blocked')
    expect(digestToMarkdown(d)).toContain('1 approval-gated task blocked')
  })

  it('surfaces CRM leads and approval-gated opportunities as decision-support signals', () => {
    const d = buildOvernightDigest([], [], AT, {
      leads: { newCount: 2, needsReviewCount: 1 },
      opportunities: {
        approvalGatedCount: 1,
        weightedForecast: { status: 'available', totalsByCurrency: [{ currency: 'AUD', amount: 12000 }] },
      },
      window: { ...WINDOW, leadsReturned: 2, opportunitiesReturned: 1 },
    })

    expect(d.crm).toEqual({
      source: 'crm:read-surface-signals',
      leads: { newCount: 2, needsReviewCount: 1 },
      opportunities: {
        approvalGatedCount: 1,
        weightedForecast: { status: 'available', totalsByCurrency: [{ currency: 'AUD', amount: 12000 }] },
      },
      window: {
        kind: 'latest-window', limit: 500, leadsReturned: 2, opportunitiesReturned: 1,
        leadsMayBeTruncated: false, opportunitiesMayBeTruncated: false,
      },
    })
    expect(d.attention).toContain('2 new CRM leads to review in latest window')
    expect(d.attention).toContain('1 approval-gated opportunity needs decision in latest window')
    expect(d.headline).toContain('2 CRM leads in latest window')
    expect(digestToMarkdown(d)).toContain('- New CRM leads in latest window: 2')
    expect(digestToMarkdown(d)).toContain('- Guardrail: CRM read-surface metrics are decision support only; no approvals, conversions, billing, or outreach are executed from this digest')
  })

  it('surfaces CRM lead-review backlog when no leads are new', () => {
    const d = buildOvernightDigest([], [], AT, {
      leads: { newCount: 0, needsReviewCount: 3 },
      opportunities: {
        approvalGatedCount: 0,
        weightedForecast: { status: 'available', totalsByCurrency: [{ currency: 'AUD', amount: 0 }] },
      },
      window: { ...WINDOW, leadsReturned: 3 },
    })

    expect(d.attention).toContain('3 CRM leads need review in latest window')
    expect(d.headline).toContain('3 CRM reviews in latest window')
    expect(digestToMarkdown(d)).toContain('3 CRM leads need review in latest window')
  })

  it('normalises invalid CRM signal numbers before rendering', () => {
    const d = buildOvernightDigest([], [], AT, {
      leads: { newCount: -3, needsReviewCount: Number.POSITIVE_INFINITY },
      opportunities: {
        approvalGatedCount: 2.9,
        weightedForecast: { status: 'available', totalsByCurrency: [{ currency: 'AUD', amount: Number.NaN }] },
      },
      window: { limit: 500, leadsReturned: Number.POSITIVE_INFINITY, opportunitiesReturned: -2 },
    })

    expect(d.crm).toEqual({
      source: 'crm:read-surface-signals',
      leads: { newCount: 0, needsReviewCount: 0 },
      opportunities: {
        approvalGatedCount: 2,
        weightedForecast: { status: 'available', totalsByCurrency: [{ currency: 'AUD', amount: 0 }] },
      },
      window: {
        kind: 'latest-window', limit: 500, leadsReturned: 0, opportunitiesReturned: 0,
        leadsMayBeTruncated: false, opportunitiesMayBeTruncated: false,
      },
    })
    expect(d.attention).not.toContain('0 new CRM leads to review in latest window')
    expect(digestToMarkdown(d)).toContain('- Weighted opportunity forecast in latest window (AUD): 0')
  })

  it('marks the forecast unavailable when currency is malformed instead of inventing AUD', () => {
    const d = buildOvernightDigest([], [], AT, {
      opportunities: {
        approvalGatedCount: 0,
        weightedForecast: {
          status: 'available',
          totalsByCurrency: [{ currency: 'AUD <script>alert("secret")</script>', amount: 1500 }],
        },
      },
      window: WINDOW,
    })

    expect(d.crm && 'leads' in d.crm ? d.crm.opportunities.weightedForecast : null).toEqual({
      status: 'unavailable', reason: 'currency_missing_or_invalid',
    })
    expect(digestToMarkdown(d)).toContain('- Weighted opportunity forecast: unavailable (currency missing or invalid)')
    expect(digestToMarkdown(d)).not.toContain('<script>')
  })

  it('keeps mixed-currency weighted forecasts separate', () => {
    const d = buildOvernightDigest([], [], AT, {
      opportunities: {
        approvalGatedCount: 0,
        weightedForecast: {
          status: 'available',
          totalsByCurrency: [
            { currency: 'AUD', amount: 5000 },
            { currency: 'USD', amount: 800 },
            { currency: 'AUD', amount: 250 },
          ],
        },
      },
      window: { ...WINDOW, opportunitiesReturned: 3 },
    })

    expect(d.crm && 'leads' in d.crm ? d.crm.opportunities.weightedForecast : null).toEqual({
      status: 'available',
      totalsByCurrency: [{ currency: 'AUD', amount: 5250 }, { currency: 'USD', amount: 800 }],
    })
    const markdown = digestToMarkdown(d)
    expect(markdown).toContain('latest window (AUD): 5250')
    expect(markdown).toContain('latest window (USD): 800')
    expect(markdown).not.toContain('6050')
  })

  it('gathers founder-scoped CRM read-surface signals from lead and opportunity rows', async () => {
    const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []
    const client = readOnlySupabase({
      cc_tasks: [task('queued')],
      cc_execution_sessions: [],
      crm_leads: [
        { founder_id: 'f', status: 'new' },
        { founder_id: 'f', status: 'qualified' },
        { founder_id: 'f', status: 'converted' },
        { founder_id: 'other-founder', status: 'new' },
      ],
      crm_opportunities: [
        {
          id: 'opp-1', founder_id: 'f', name: 'RestoreAssist package', stage: 'proposal_sent', status: 'open',
          value_amount: 10000, value_currency: 'AUD', probability: 50, expected_close_at: null,
          approval_required: false, approval_status: 'not_required', next_action: null,
        },
        {
          id: 'opp-2', founder_id: 'f', name: 'Conversion decision', stage: 'won_pending_client_conversion', status: 'won',
          value_amount: 2500, value_currency: 'USD', probability: 80, expected_close_at: null,
          approval_required: false, approval_status: 'requested', next_action: 'Phill approval',
        },
        {
          id: 'opp-other', founder_id: 'other-founder', name: 'Wrong founder', stage: 'proposal_sent', status: 'open',
          value_amount: 999999, value_currency: 'AUD', probability: 100, expected_close_at: null,
          approval_required: true, approval_status: 'requested', next_action: null,
        },
      ],
    }, calls)

    const d = await gatherOvernightDigest({ founderId: 'f', generatedAt: AT }, client as any)

    expect(d.crm).toEqual({
      source: 'crm:read-surface-signals',
      leads: { newCount: 1, needsReviewCount: 2 },
      opportunities: {
        approvalGatedCount: 1,
        weightedForecast: {
          status: 'available',
          totalsByCurrency: [{ currency: 'AUD', amount: 5000 }, { currency: 'USD', amount: 2000 }],
        },
      },
      window: {
        kind: 'latest-window', limit: 500, leadsReturned: 3, opportunitiesReturned: 2,
        leadsMayBeTruncated: false, opportunitiesMayBeTruncated: false,
      },
    })
    expect(d.attention).toContain('1 new CRM lead to review in latest window')
    expect(d.attention).toContain('1 approval-gated opportunity needs decision in latest window')
    expect(calls.filter((call) => call.table === 'crm_leads')[0]?.filters).toContainEqual(['founder_id', 'f'])
    expect(calls.filter((call) => call.table === 'crm_opportunities')[0]?.filters).toContainEqual(['founder_id', 'f'])
  })

  it('marks a full latest-500 read as potentially truncated rather than a complete total', async () => {
    const leads = Array.from({ length: 500 }, (_, index) => ({ founder_id: 'f', status: index === 0 ? 'new' : 'converted' }))
    const client = readOnlySupabase({
      cc_tasks: [],
      cc_execution_sessions: [],
      crm_leads: leads,
      crm_opportunities: [],
    })

    const d = await gatherOvernightDigest({ founderId: 'f', generatedAt: AT }, client as any)

    expect(d.crm && 'leads' in d.crm ? d.crm.window : null).toMatchObject({
      kind: 'latest-window', limit: 500, leadsReturned: 500, leadsMayBeTruncated: true,
    })
    expect(digestToMarkdown(d)).toContain('- Window may be truncated: leads yes; opportunities no')
    expect(digestToMarkdown(d)).toContain('- New CRM leads in latest window: 1')
  })

  it('surfaces CRM read failures as an honest unavailable read-surface state', async () => {
    const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []
    const client = readOnlySupabase({
      cc_tasks: [],
      cc_execution_sessions: [],
      crm_leads: [],
      crm_opportunities: [],
    }, calls, { crm_leads: 'permission denied' })

    const d = await gatherOvernightDigest({ founderId: 'f', generatedAt: AT }, client as any)

    expect(d.crm).toEqual({
      source: 'crm:read-surface-signals',
      status: 'unavailable',
      reason: 'read_failed',
    })
    expect(d.attention).toContain('CRM read surface unavailable — check lead/opportunity sync before decisions')
    expect(digestToMarkdown(d)).toContain('- Status: unavailable')
    expect(digestToMarkdown(d)).toContain('- Guardrail: no CRM approvals, conversions, billing, or outreach should use this degraded digest')
    expect(calls.filter((call) => call.table === 'crm_leads')[0]?.filters).toContainEqual(['founder_id', 'f'])
    expect(calls.filter((call) => call.table === 'crm_opportunities')[0]?.filters).toContainEqual(['founder_id', 'f'])
  })

  it('clear board ⇒ no attention items', () => {
    const d = buildOvernightDigest([task('queued'), task('done')], [sess('done')], AT)
    expect(d.attention).toEqual([])
  })

  it('empty queue headline', () => {
    const d = buildOvernightDigest([], [], AT)
    expect(d.headline).toMatch(/No tasks/)
  })
})

describe('digestToMarkdown', () => {
  it('includes the headline and attention items', () => {
    const d = buildOvernightDigest([task('proposed')], [], AT)
    const md = digestToMarkdown(d)
    expect(md).toContain('## Morning digest')
    expect(md).toContain('Needs your attention')
    expect(md).toContain('1 task awaiting your decision')
  })

  it('says board is clear when nothing needs attention', () => {
    const d = buildOvernightDigest([task('done')], [], AT)
    expect(digestToMarkdown(d)).toContain('the board is clear')
  })
})
