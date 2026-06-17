import { describe, it, expect } from 'vitest'
import { formatBriefMarkdown } from '../route'

function brief(successRate: number | null) {
  return {
    headline: 'Weekly review',
    executiveSummary: 'Summary',
    velocityScore: 50,
    topWins: [],
    blockers: [],
    risks: [],
    decisionsRequired: [],
    nextWeekPriorities: [],
    metrics: { agents: { executions: successRate === null ? 0 : 5, avgDurationSec: 0, successRate } },
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
})
