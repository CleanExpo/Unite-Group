// Step 3 of the Advisory Debate QA build spec — the LiveDebateTab must render an
// honest warning when firms were dropped, so a partial debate is never shown as
// complete (financial-advice integrity rule / F2).
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdvisoryCase, DebateEvent, JudgeScoreSummary } from '@/lib/advisory/types'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockSearchParams = { get: vi.fn(() => 'case-1') }
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

// framer-motion → plain divs so jsdom doesn't choke on animation.
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode }
    return <div {...(rest as object)}>{children}</div>
  } }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Realtime channel stub — tests can push events through the captured handler.
let broadcastHandler: ((message: { payload: DebateEvent }) => void) | null = null
const channelStub = {
  on: vi.fn((_type: string, _filter: unknown, callback: (message: { payload: DebateEvent }) => void) => {
    broadcastHandler = callback
    return channelStub
  }),
  subscribe: vi.fn().mockReturnThis(),
}
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    channel: () => channelStub,
    removeChannel: vi.fn(),
  }),
}))

// Child cards — keep the test focused on the warning.
vi.mock('../../shared/ProposalCard', () => ({ ProposalCard: () => <div /> }))
vi.mock('../../shared/JudgeScorecard', () => ({ JudgeScorecard: () => <div /> }))

import { LiveDebateTab } from '../LiveDebateTab'

function makeCase(judgeScores: JudgeScoreSummary | null, overrides: Partial<AdvisoryCase> = {}): AdvisoryCase {
  return {
    id: overrides.id ?? 'case-1',
    founder_id: 'founder-1',
    business_id: null,
    title: overrides.title ?? 'Advisory Case Alpha',
    scenario: 's',
    financial_context: {} as AdvisoryCase['financial_context'],
    source: 'manual',
    status: 'pending_review',
    current_round: 5,
    total_rounds: 5,
    winning_firm: 'tax_strategy',
    judge_summary: 'Scored 3 of 4 firms (partial debate).',
    judge_scores: judgeScores,
    accountant_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    approval_queue_id: null,
    created_at: '2026-06-22T00:00:00Z',
    updated_at: '2026-06-22T00:00:00Z',
  }
}

function mockFetchCase(c: AdvisoryCase) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ case: c, proposals: [] }),
  }) as unknown as typeof fetch
}

function mockFetchCases(casesById: Record<string, AdvisoryCase>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const caseId = url.match(/\/api\/advisory\/cases\/([^/]+)/)?.[1] ?? 'case-1'
    return {
      ok: true,
      json: async () => ({ case: casesById[caseId], proposals: [] }),
    }
  }) as unknown as typeof fetch
}

describe('LiveDebateTab — partial-debate warning (Step 3 / F2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollTo = vi.fn()
    broadcastHandler = null
    mockSearchParams.get.mockReturnValue('case-1')
  })

  it('renders an honest warning when the debate is partial', async () => {
    mockFetchCase(makeCase({
      scores: [],
      winner: 'tax_strategy',
      summary: 'Scored 3 of 4 firms (partial debate).',
      partial: true,
      scoredFirmCount: 3,
      droppedFirms: ['compliance'],
    }))

    render(<LiveDebateTab />)

    const warning = await screen.findByText(/3 of 4 firms/i)
    expect(warning).toBeInTheDocument()
    // Names the dropped firm so the founder knows exactly what's missing.
    expect(screen.getByText(/compliance/i)).toBeInTheDocument()
  })

  it('renders an honest warning when persisted dropped firms exist without an explicit partial flag', async () => {
    mockFetchCase(makeCase({
      scores: [],
      winner: 'tax_strategy',
      summary: 'Scored 3 of 4 firms (partial debate).',
      scoredFirmCount: 3,
      droppedFirms: ['compliance'],
    }))

    render(<LiveDebateTab />)

    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent(/3 of 4 firms/i)
    expect(warning).toHaveTextContent(/compliance/i)
    expect(warning).toHaveStyle({ borderColor: '#00F5FF' })
  })

  it('clears live dropped-firm warnings when switching to a different case', async () => {
    mockFetchCases({
      'case-1': makeCase(null, { id: 'case-1', title: 'Advisory Case Alpha' }),
      'case-2': makeCase({
        scores: [],
        winner: 'tax_strategy',
        summary: 'The Tax Strategy firm wins.',
      }, { id: 'case-2', title: 'Advisory Case Beta' }),
    })

    const { rerender } = render(<LiveDebateTab />)
    await screen.findByText('Advisory Case Alpha')

    act(() => {
      broadcastHandler?.({
        payload: {
          event: 'firm_dropped',
          firm: 'compliance',
          round: 4,
          reason: 'proposal_persist_failed',
        },
      })
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/compliance/i)

    mockSearchParams.get.mockReturnValue('case-2')
    rerender(<LiveDebateTab />)

    await screen.findByText('Advisory Case Beta')
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('does not render the warning for a complete debate', async () => {
    mockFetchCase(makeCase({
      scores: [],
      winner: 'tax_strategy',
      summary: 'The Tax Strategy firm wins.',
    }))

    render(<LiveDebateTab />)

    // Wait for the title to confirm the case loaded, then assert no warning.
    await screen.findByText('Advisory Case Alpha')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/partial debate/i)).not.toBeInTheDocument()
  })
})
