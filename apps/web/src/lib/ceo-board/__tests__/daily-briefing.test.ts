import { describe, it, expect } from 'vitest'
import { buildXeroBlock, type BriefingInput } from '../daily-briefing'

function input(xeroSummary: BriefingInput['xeroSummary']): BriefingInput {
  return {
    meetingDate: '27/06/2026',
    coachReports: [],
    strategyInsights: [],
    linearCompleted: [],
    linearInFlight: [],
    linearOverdue: [],
    githubCommits: [],
    githubPRs: [],
    xeroSummary,
    openDecisions: 0,
    githubConfigured: false,
  }
}

describe('buildXeroBlock — demo revenue labelling (B1)', () => {
  it('returns "No Xero data available" when empty', () => {
    expect(buildXeroBlock(input([]))).toBe('No Xero data available')
  })

  it('does NOT mark real (xero-sourced) revenue as demo', () => {
    const out = buildXeroBlock(input([
      { businessKey: 'dr', revenueAud: 1_000_00, expensesAud: 500_00, growth: 5, source: 'xero' },
    ]))
    expect(out).not.toContain('DEMO')
    expect(out).not.toContain('NOTE:')
    expect(out).toContain('DR: Revenue AUD $1,000')
  })

  it('labels mock-sourced revenue as DEMO and prepends a warning banner', () => {
    const out = buildXeroBlock(input([
      { businessKey: 'dr', revenueAud: 1_000_00, expensesAud: 500_00, growth: 5, source: 'mock' },
    ]))
    expect(out).toContain('(DEMO — Xero not connected, placeholder figures)')
    expect(out.split('\n')[0]).toContain('NOTE:')
    expect(out).toContain('do not base decisions on them')
  })

  it('only marks the mock lines when sources are mixed', () => {
    const out = buildXeroBlock(input([
      { businessKey: 'dr', revenueAud: 1_000_00, expensesAud: 500_00, growth: 5, source: 'xero' },
      { businessKey: 'ccw', revenueAud: 2_000_00, expensesAud: 900_00, growth: -2, source: 'mock' },
    ]))
    const drLine = out.split('\n').find((l) => l.startsWith('DR:'))
    const ccwLine = out.split('\n').find((l) => l.startsWith('CCW:'))
    expect(drLine).not.toContain('DEMO')
    expect(ccwLine).toContain('DEMO')
  })

  it('treats missing source (undefined) as not-demo for backward compatibility', () => {
    const out = buildXeroBlock(input([
      { businessKey: 'dr', revenueAud: 1_000_00, expensesAud: 500_00, growth: 5 },
    ]))
    expect(out).not.toContain('DEMO')
  })
})
