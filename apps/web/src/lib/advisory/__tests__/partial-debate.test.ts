// src/lib/advisory/__tests__/partial-debate.test.ts
// Step 3 of the Advisory Debate QA build spec — partial-debate integrity (F2).
// When a firm's proposal/evidence fails to persist, the debate CONTINUES with the
// firms that did persist, but emits a `firm_dropped` event, records the degraded
// set on the case, and tells the Judge it scored N of 4 firms.
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared before SUT import
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

const mockBuildFirmUserMessage = vi.fn(() => 'firm-msg')
const mockBuildJudgeUserMessage = vi.fn((..._args: unknown[]) => 'judge-msg')
const mockCallFirmAgent = vi.fn()
const mockCallJudgeAgent = vi.fn()
vi.mock('@/lib/advisory/agents', () => ({
  getFirmAgentConfigs: () => ({
    tax_strategy: {}, grants_incentives: {}, cashflow_optimisation: {}, compliance: {},
  }),
  buildFirmUserMessage: (...a: unknown[]) => mockBuildFirmUserMessage(...a),
  callFirmAgent: (...a: unknown[]) => mockCallFirmAgent(...a),
  buildJudgeUserMessage: (...a: unknown[]) => mockBuildJudgeUserMessage(...a),
  callJudgeAgent: (...a: unknown[]) => mockCallJudgeAgent(...a),
}))

vi.mock('@/lib/advisory/evidence-extractor', () => ({
  extractCitations: () => [],
}))

const mockNotify = vi.fn()
vi.mock('@/lib/notifications', () => ({ notify: (...a: unknown[]) => mockNotify(...a) }))

vi.mock('@/lib/advisory/session-memory', () => ({
  recallAdvisoryContext: vi.fn().mockResolvedValue(''),
  storeAdvisoryOutcome: vi.fn().mockResolvedValue(undefined),
}))

import { runDebate } from '../debate-engine'
import { FIRM_KEYS } from '../types'
import type { DebateEvent, FirmKey, FirmProposalData } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProposal(summary = 'A solid plan'): FirmProposalData {
  return {
    summary,
    strategies: [],
    confidenceScore: 80,
    riskFlags: [],
    auditTriggers: [],
  }
}

function firmResult(firmKey: FirmKey) {
  return {
    proposal: makeProposal(`${firmKey} summary`),
    rawContent: `${firmKey} raw content`,
    inputTokens: 10,
    outputTokens: 20,
    model: 'test-model',
  }
}

// Fresh object per call — the engine mutates `scores` to stamp partial markers,
// so a shared reference would leak between tests.
function makeJudgeResult() {
  return {
    scores: {
      scores: [
        { firmKey: 'tax_strategy', legality: 90, complianceRisk: 80, financialOutcome: 70, documentation: 60, ethics: 50, weightedTotal: 80, rationale: 'r', riskFlags: [], auditTriggers: [] },
      ],
      winner: 'tax_strategy' as FirmKey,
      summary: 'The Tax Strategy firm wins.',
    },
  }
}

/**
 * Build a Supabase mock where the proposal insert for ONE firm fails.
 * Captures the case-update payloads so we can assert the degraded set is recorded.
 */
function setupMocks({
  failFirm,
  failAllRound5 = false,
}: { failFirm?: FirmKey; failAllRound5?: boolean } = {}) {
  const caseUpdates: Array<Record<string, unknown>> = []
  const judgeScoreInserts: Array<Record<string, unknown>> = []

  mockFrom.mockImplementation((table: string) => {
    if (table === 'advisory_cases') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'case-1',
            founder_id: 'founder-1',
            title: 'Test Case',
            scenario: 'Scenario text',
            financial_context: { businessKey: 'synthex', businessName: 'Synthex', snapshotDate: '22/06/2026' },
            status: 'draft',
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
      return {
        insert: vi.fn((row: { firm_key: FirmKey; round: number }) => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(
            (failAllRound5 && row.round === 5) || (failFirm && row.firm_key === failFirm)
              ? { data: null, error: { message: 'insert failed' } }
              : { data: { id: `prop-${row.firm_key}` }, error: null }
          ),
        })),
      }
    }

    if (table === 'advisory_evidence') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }

    if (table === 'advisory_judge_scores') {
      return {
        insert: vi.fn((rows: Record<string, unknown>) => {
          judgeScoreInserts.push(rows)
          return Promise.resolve({ error: null })
        }),
      }
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

  return { caseUpdates, judgeScoreInserts }
}

async function drain(caseId: string, founderId: string): Promise<DebateEvent[]> {
  const events: DebateEvent[] = []
  for await (const e of runDebate(caseId, founderId)) events.push(e)
  return events
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runDebate — partial-debate integrity (Step 3 / F2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue(undefined)
    mockCallFirmAgent.mockImplementation(async () => {
      // Resolve a proposal for whichever firm is being called. We can't know the
      // firmKey from the config mock, so return a generic proposal; the engine
      // tags the firmKey itself when persisting.
      return firmResult('tax_strategy')
    })
    mockCallJudgeAgent.mockImplementation(async () => makeJudgeResult())
  })

  it('emits a firm_dropped event when a proposal insert fails', async () => {
    setupMocks({ failFirm: 'compliance' })
    const events = await drain('case-1', 'founder-1')

    const dropped = events.filter(e => e.event === 'firm_dropped')
    expect(dropped.length).toBeGreaterThanOrEqual(1)
    // The dropped event names the firm and carries a reason.
    const compliance = dropped.find(e => (e as { firm: FirmKey }).firm === 'compliance')
    expect(compliance).toBeDefined()
    expect((compliance as { reason: string }).reason).toMatch(/insert/i)
  })

  it('records the degraded set on the case (judge_scores marked partial)', async () => {
    const { caseUpdates } = setupMocks({ failFirm: 'compliance' })
    await drain('case-1', 'founder-1')

    // The final case update (judge phase) carries the partial/degraded marker.
    const judgeUpdate = caseUpdates.find(u => 'judge_scores' in u)
    expect(judgeUpdate).toBeDefined()
    const summary = judgeUpdate!.judge_scores as { partial?: boolean; scoredFirmCount?: number; droppedFirms?: string[] }
    expect(summary.partial).toBe(true)
    expect(summary.droppedFirms).toContain('compliance')
    expect(summary.scoredFirmCount).toBe(FIRM_KEYS.length - 1)
  })

  it('tells the Judge it scored N of 4 firms when the set is partial', async () => {
    setupMocks({ failFirm: 'compliance' })
    await drain('case-1', 'founder-1')

    // The judge message is augmented with an honest "scored 3 of 4 firms" note.
    const judgeCallArg = mockCallJudgeAgent.mock.calls[0][0] as string
    expect(judgeCallArg).toMatch(/3 of 4 firms/i)
  })

  it('passes only persisted final-round proposals to the Judge when a firm drops', async () => {
    setupMocks({ failFirm: 'compliance' })
    await drain('case-1', 'founder-1')

    const builderArgs = mockBuildJudgeUserMessage.mock.calls[0]
    const finalProposals = builderArgs[2] as Record<string, string>
    expect(finalProposals.tax_strategy).toBeDefined()
    expect(finalProposals.grants_incentives).toBeDefined()
    expect(finalProposals.cashflow_optimisation).toBeDefined()
    expect(finalProposals.compliance).toBeUndefined()
  })

  it('aborts judging when no round-5 proposals persisted', async () => {
    setupMocks({ failAllRound5: true })
    const events = await drain('case-1', 'founder-1')

    expect(mockCallJudgeAgent).not.toHaveBeenCalled()
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ event: 'judge_start' }),
      expect.objectContaining({ event: 'error', message: expect.stringMatching(/No persisted round-5 proposals/i) }),
    ]))
  })

  it('logs notification failures without blocking case completion', async () => {
    setupMocks()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNotify.mockRejectedValueOnce(new Error('notification failed'))

    try {
      const events = await drain('case-1', 'founder-1')
      await Promise.resolve()

      expect(events.some(e => e.event === 'case_complete')).toBe(true)
      expect(errorSpy).toHaveBeenCalledWith(
        '[debate-engine] Failed to send advisory completion notification:',
        'notification failed'
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('does not mark the case partial when every firm persists', async () => {
    const { caseUpdates } = setupMocks()
    await drain('case-1', 'founder-1')

    const judgeUpdate = caseUpdates.find(u => 'judge_scores' in u)
    const summary = judgeUpdate!.judge_scores as { partial?: boolean }
    expect(summary.partial).toBeFalsy()
    // Judge is not told about a partial set.
    const judgeCallArg = mockCallJudgeAgent.mock.calls[0][0] as string
    expect(judgeCallArg).not.toMatch(/of 4 firms/i)
  })
})
