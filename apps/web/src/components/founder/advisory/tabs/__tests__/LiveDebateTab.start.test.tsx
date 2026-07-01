// UNI-2221 — startDebate() must surface a failure and reset the "started" flag so
// the founder is never stranded on a stuck "Starting..." / started state.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdvisoryCase } from '@/lib/advisory/types'

const mockSearchParams = { get: vi.fn(() => 'case-1') }
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode }
    return <div {...(rest as object)}>{children}</div>
  } }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const channelStub = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    channel: () => channelStub,
    removeChannel: vi.fn(),
  }),
}))

vi.mock('../../shared/ProposalCard', () => ({ ProposalCard: () => <div /> }))
vi.mock('../../shared/JudgeScorecard', () => ({ JudgeScorecard: () => <div /> }))

import { LiveDebateTab } from '../LiveDebateTab'

const draftCase: AdvisoryCase = {
  id: 'case-1',
  founder_id: 'founder-1',
  business_id: null,
  title: 'Draft Case',
  scenario: 's',
  financial_context: {} as AdvisoryCase['financial_context'],
  source: 'manual',
  status: 'draft',
  current_round: 0,
  total_rounds: 5,
  winning_firm: null,
  judge_summary: null,
  judge_scores: null,
  accountant_notes: null,
  reviewed_by: null,
  reviewed_at: null,
  approval_queue_id: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

// Case GET succeeds; the /start POST fails.
function mockFetchStartFails() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/start')) {
      return { ok: false, status: 500, json: async () => ({}) }
    }
    return { ok: true, json: async () => ({ case: draftCase, proposals: [] }) }
  }) as unknown as typeof fetch
}

describe('LiveDebateTab — start-debate failure (UNI-2221)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollTo = vi.fn()
    mockSearchParams.get.mockReturnValue('case-1')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('surfaces an error and re-enables the Start button when the start API fails', async () => {
    mockFetchStartFails()

    render(<LiveDebateTab />)

    const startBtn = await screen.findByText('Start Debate')
    fireEvent.click(startBtn)

    // Error is surfaced honestly.
    await waitFor(() => {
      expect(screen.getByText(/could not start the debate/i)).toBeInTheDocument()
    })
    // started flag reset → the Start Debate control comes back (user isn't stuck).
    await waitFor(() => {
      expect(screen.getByText('Start Debate')).toBeInTheDocument()
    })
  })
})
