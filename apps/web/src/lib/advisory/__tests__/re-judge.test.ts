// src/lib/advisory/__tests__/re-judge.test.ts
// Step 5 of the Advisory Debate QA build spec — stranded-case recovery (F4).
// A case stuck at status='judged' (judge phase failed mid-run) can be recovered
// by re-running ONLY the Judge phase from the persisted round-5 proposals,
// ending at status='pending_review'. The full debate is NOT re-run.
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

const mockBuildJudgeUserMessage = vi.fn(() => 'judge-msg')
const mockCallJudgeAgent = vi.fn()
const mockCallFirmAgent = vi.fn()
vi.mock('@/lib/advisory/agents', () => ({
  getFirmAgentConfigs: () => ({}),
  buildFirmUserMessage: vi.fn(() => 'firm-msg'),
  callFirmAgent: (...a: unknown[]) => mockCallFirmAgent(...a),
  buildJudgeUserMessage: (...a: unknown[]) => mockBuildJudgeUserMessage(...a),
  callJudgeAgent: (...a: unknown[]) => mockCallJudgeAgent(...a),
}))

vi.mock('@/lib/advisory/evidence-extractor', () => ({ extractCitations: () => [] }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/advisory/session-memory', () => ({
  recallAdvisoryContext: vi.fn().mockResolvedValue(''),
  storeAdvisoryOutcome: vi.fn().mockResolvedValue(undefined),
}))

import { reJudgeCase } from '../debate-engine'
import type { DebateEvent, FirmKey } from '../types'

const JUDGE_RESULT = () => ({
  scores: {
    scores: [
      { firmKey: 'tax_strategy', legality: 90, complianceRisk: 80, financialOutcome: 70, documentation: 60, ethics: 50, weightedTotal: 80, rationale: 'r', riskFlags: [], auditTriggers: [] },
    ],
    winner: 'tax_strategy' as FirmKey,
    summary: 'The Tax Strategy firm wins on re-judge.',
  },
})

function setupMocks({
  caseStatus = 'judged',
  round5Proposals = [
    { firm_key: 'tax_strategy', content: 'tax final', round: 5 },
    { firm_key: 'compliance', content: 'compliance final', round: 5 },
  ],
}: { caseStatus?: string; round5Proposals?: Array<Record<string, unknown>> } = {}) {
  const caseUpdates: Array<Record<string, unknown>> = []

  mockFrom.mockImplementation((table: string) => {
    if (table === 'advisory_cases') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-1',
            founder_id: 'founder-1',
            title: 'Stranded Case',
            scenario: 'Scenario',
            financial_context: { businessKey: 'synthex', businessName: 'Synthex', snapshotDate: '22/06/2026' },
            status: caseStatus,
          },
          error: null,
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          caseUpdates.push(payload)
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }

    if (table === 'advisory_proposals') {
      // Loader for persisted round-5 proposals.
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: round5Proposals, error: null }),
      }
      return chain
    }

    if (table === 'advisory_judge_scores') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }

    if (table === 'approval_queue') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'queue-1' }, error: null }),
        }),
      }
    }

    return { insert: vi.fn().mockResolvedValue({ error: null }) }
  })

  return { caseUpdates }
}

async function drain(gen: AsyncGenerator<DebateEvent>): Promise<DebateEvent[]> {
  const events: DebateEvent[] = []
  for await (const e of gen) events.push(e)
  return events
}

describe('reJudgeCase — stranded-case recovery (Step 5 / F4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCallJudgeAgent.mockImplementation(async () => JUDGE_RESULT())
  })

  it('re-runs the judge phase and ends at pending_review', async () => {
    const { caseUpdates } = setupMocks({ caseStatus: 'judged' })

    const events = await drain(reJudgeCase('case-1', 'founder-1'))

    // Judge ran (no firm rounds).
    expect(mockCallFirmAgent).not.toHaveBeenCalled()
    expect(mockCallJudgeAgent).toHaveBeenCalledTimes(1)
    expect(events.some(e => e.event === 'judge_start')).toBe(true)
    expect(events.some(e => e.event === 'judge_complete')).toBe(true)

    // Case finished at pending_review.
    const finalUpdate = caseUpdates.find(u => u.status === 'pending_review')
    expect(finalUpdate).toBeDefined()
    expect(finalUpdate!.winning_firm).toBe('tax_strategy')
  })

  it('feeds the persisted round-5 proposals to the judge message builder', async () => {
    setupMocks({ caseStatus: 'judged' })
    await drain(reJudgeCase('case-1', 'founder-1'))

    const builderArgs = mockBuildJudgeUserMessage.mock.calls[0]
    const finalProposals = builderArgs[2] as Record<string, string>
    expect(finalProposals.tax_strategy).toBe('tax final')
    expect(finalProposals.compliance).toBe('compliance final')
  })

  it('refuses to re-judge a case that is not in judged status', async () => {
    const { caseUpdates } = setupMocks({ caseStatus: 'pending_review' })

    const events = await drain(reJudgeCase('case-1', 'founder-1'))

    expect(events.some(e => e.event === 'error')).toBe(true)
    expect(mockCallJudgeAgent).not.toHaveBeenCalled()
    expect(caseUpdates.find(u => u.status === 'pending_review')).toBeUndefined()
  })

  it('errors when there are no persisted round-5 proposals to judge', async () => {
    setupMocks({ caseStatus: 'judged', round5Proposals: [] })

    const events = await drain(reJudgeCase('case-1', 'founder-1'))

    expect(events.some(e => e.event === 'error')).toBe(true)
    expect(mockCallJudgeAgent).not.toHaveBeenCalled()
  })
})
