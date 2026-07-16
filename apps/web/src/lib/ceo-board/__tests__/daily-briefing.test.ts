import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stable mock reference — same object returned every time (pattern per lib/ai router.test.ts)
const mockCreate = vi.fn()
const mockClient = { messages: { create: mockCreate } }

vi.mock('@/lib/ai/client', () => ({
  getAIClient: vi.fn(() => mockClient),
}))

import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import { buildXeroBlock, runDailyBriefing, BoardBriefingParseError, type BriefingInput, type BoardMeetingResult } from '../daily-briefing'

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

describe('runDailyBriefing — briefing JSON parse guard (UNI-2391)', () => {
  const validResult: BoardMeetingResult = {
    agenda: {
      shipped: { title: 'What shipped yesterday', items: ['UNI-1: thing shipped'], highlight: 'Good day' },
    },
    brief_md: '# Board minutes\n\nAll seven sections.',
    decisionsRequired: ['Approve the thing'],
  }

  /** Queue Sonnet (Phase 2) responses; Haiku (Phase 1 summariser) calls get plain text. */
  function queueSonnetTexts(texts: string[]) {
    const queue = [...texts]
    mockCreate.mockImplementation(async (params: { model: string }) => {
      if (params.model === ANTHROPIC_MODELS.HAIKU) {
        return { content: [{ type: 'text', text: 'summary bullets' }] }
      }
      const text = queue.shift() ?? ''
      return { content: [{ type: 'text', text }] }
    })
  }

  function sonnetCalls() {
    return mockCreate.mock.calls.filter(([params]) => (params as { model: string }).model === ANTHROPIC_MODELS.SONNET)
  }

  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('parses clean JSON on the first attempt (no retry)', async () => {
    queueSonnetTexts([JSON.stringify(validResult)])
    const result = await runDailyBriefing(input([]))
    expect(result).toEqual(validResult)
    expect(sonnetCalls()).toHaveLength(1)
  })

  it('recovers fenced/prefixed JSON via extraction (no retry)', async () => {
    queueSonnetTexts([`Here is the briefing:\n\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``])
    const result = await runDailyBriefing(input([]))
    expect(result).toEqual(validResult)
    expect(sonnetCalls()).toHaveLength(1)
  })

  it('retries once when the extracted blob is still malformed, and uses the retry result', async () => {
    // Extraction finds a {...} blob but it is still invalid JSON — the prod failure mode.
    queueSonnetTexts(['{"agenda": {"shipped": }', JSON.stringify(validResult)])
    const result = await runDailyBriefing(input([]))
    expect(result).toEqual(validResult)
    expect(sonnetCalls()).toHaveLength(2)
    // The retry asks for strictly valid JSON re-emission
    const retryParams = sonnetCalls()[1][0] as { messages: Array<{ role: string; content: string }> }
    expect(retryParams.messages.at(-1)?.content).toContain('strictly valid JSON')
  })

  it('throws BoardBriefingParseError with a short prefix when the retry is also malformed', async () => {
    const malformed = '{"agenda": {"broken": }' + 'x'.repeat(500)
    queueSonnetTexts([malformed, malformed])
    const promise = runDailyBriefing(input([]))
    await expect(promise).rejects.toThrow(BoardBriefingParseError)
    await expect(promise).rejects.toThrow(/Output starts: "\{"agenda"/)
    // Message carries only a short prefix, never the full dump
    await promise.catch((err: Error) => {
      expect(err.message.length).toBeLessThan(250)
    })
    expect(sonnetCalls()).toHaveLength(2)
  })

  it('treats structurally invalid JSON (missing required keys) as a parse failure and retries', async () => {
    queueSonnetTexts(['{"foo": 1}', JSON.stringify(validResult)])
    const result = await runDailyBriefing(input([]))
    expect(result).toEqual(validResult)
    expect(sonnetCalls()).toHaveLength(2)
  })
})
