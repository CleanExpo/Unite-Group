import { describe, it, expect } from 'vitest'
import { formatBriefMarkdown, isUndefinedTableError } from '../route'

function brief(successRate: number | null, tableMigrated = true) {
  return {
    headline: 'Weekly review',
    executiveSummary: 'Summary',
    velocityScore: 50,
    topWins: [],
    blockers: [],
    risks: [],
    decisionsRequired: [],
    nextWeekPriorities: [],
    metrics: { agents: { executions: successRate === null ? 0 : 5, avgDurationSec: 0, successRate, tableMigrated } },
  }
}

describe('formatBriefMarkdown — honest agent success rate', () => {
  it('shows N/A (not a fabricated 100%) when no agent runs are tracked', () => {
    const md = formatBriefMarkdown(brief(null))
    expect(md).toContain('Agent Success Rate | N/A (no agent runs tracked)')
    expect(md).not.toContain('Agent Success Rate | 100%')
    expect(md).not.toContain('Agent Success Rate | 0%')
  })

  it('shows the real percentage when agent runs exist', () => {
    const md = formatBriefMarkdown(brief(80))
    expect(md).toContain('Agent Success Rate | 80%')
  })

  it('shows "table not migrated" (not a fabricated 0%) when agent_executions is missing (UNI-2284)', () => {
    const md = formatBriefMarkdown(brief(null, false))
    expect(md).toContain('Agent Success Rate | N/A (table not migrated)')
    expect(md).not.toContain('Agent Success Rate | N/A (no agent runs tracked)')
  })
})

describe('isUndefinedTableError — 42P01 detection (UNI-2284)', () => {
  it('detects a mocked 42P01 (undefined_table) Postgres error', () => {
    expect(
      isUndefinedTableError({ code: '42P01', message: 'relation "public.agent_executions" does not exist' }),
    ).toBe(true)
  })

  it('does not mistake other error codes for undefined_table', () => {
    expect(isUndefinedTableError({ code: '23505', message: 'duplicate key' })).toBe(false)
  })

  it('returns false for null/undefined/non-object input', () => {
    expect(isUndefinedTableError(null)).toBe(false)
    expect(isUndefinedTableError(undefined)).toBe(false)
    expect(isUndefinedTableError('42P01')).toBe(false)
  })
})
