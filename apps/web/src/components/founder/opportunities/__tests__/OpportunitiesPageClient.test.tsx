import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpportunitiesPageClient } from '../OpportunitiesPageClient'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function resp(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response)
}

describe('OpportunitiesPageClient', () => {
  it('renders the pipeline list + weighted-pipeline KPI from the API', async () => {
    fetchMock.mockReturnValue(resp({
      opportunities: [
        { id: 'o1', name: 'CARSI annual deal', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60, next_action: 'send quote' },
      ],
      summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
      readiness: {
        queueWindow: 'latest_500_created_at',
        pagination: 'cursor_by_created_at',
        latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
        nextCursor: null,
      },
    }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('CARSI annual deal')).toBeInTheDocument()
    expect(screen.getByText('$7,200')).toBeInTheDocument() // weighted pipeline KPI
    expect(screen.getByText('CRM source: crm_opportunities')).toBeInTheDocument()
    expect(screen.getByText('Forecast only · Billing truth stays in Stripe')).toBeInTheDocument()
    expect(screen.getByText('Queue window: latest 500 by created date · Cursor pagination available for older opportunities')).toBeInTheDocument()
    expect(screen.getByText('Latest opportunity update: 05/07/2026, 06:45 pm AEST')).toBeInTheDocument()
    expect(screen.getByText(/Proposal Sent · open/)).toBeInTheDocument() // the list row, not the filter <option>
    expect(fetchMock).toHaveBeenCalledWith('/api/founder/opportunities', {
      credentials: 'include',
      cache: 'no-store',
    })
  })

  it('redacts sensitive opportunity names and next actions before rendering pipeline rows', async () => {
    const email = ['lead', 'restoreassist.example'].join('@')
    const boardRef = ['BOARD', '2026', '06', '29', 'CRM', '777'].join('-')
    const apiKeyAssignment = ['CRM', 'API', 'KEY'].join('_') + '=' + ['sk', 'test', 'opportunity'].join('_')
    const bearer = ['Bearer ', 'eyJheader', '.', 'eyJpayload', '.', 'signature'].join('')
    const phone = ['+61', '400', '123', '456'].join(' ')
    const card = ['card ending', '4242'].join(' ')

    fetchMock.mockReturnValue(resp({
      opportunities: [
        {
          id: 'o-sensitive',
          name: `Approve ${email} against ${boardRef}`,
          stage: 'proposal_sent',
          status: 'open',
          value_amount: 12000,
          probability: 60,
          next_action: `Call ${phone}; ${apiKeyAssignment}; ${bearer}; ${card}`,
        },
      ],
      summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
    }))

    render(<OpportunitiesPageClient />)

    await screen.findByText(/Approve \[REDACTED\] against \[REDACTED\]/)
    const pageText = document.body.textContent ?? ''

    expect(pageText).not.toContain(email)
    expect(pageText).not.toContain(boardRef)
    expect(pageText).not.toContain(apiKeyAssignment)
    expect(pageText).not.toContain(bearer)
    expect(pageText).not.toContain(phone)
    expect(pageText).not.toContain(card)
    expect(pageText).toContain('[REDACTED]')
  })

  it('loads older opportunities when a next cursor is available', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'newer', name: 'Newer retained opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'older', name: 'Older fetched opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 4000, weightedPipeline: 1000 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-04T07:00:00.000Z',
          nextCursor: null,
        },
      }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Newer retained opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older fetched opportunity')).toBeInTheDocument()
    expect(screen.getByText('Newer retained opportunity')).toBeInTheDocument()
    expect(screen.getByText('Latest opportunity update: 05/07/2026, 06:45 pm AEST')).toBeInTheDocument()
    expect(screen.getByText('$8,200')).toBeInTheDocument()
    expect(screen.getByText('$16,000')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/founder/opportunities?before=2026-07-04T00%3A00%3A00.000Z', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(screen.queryByRole('button', { name: /load older opportunities/i })).not.toBeInTheDocument()
  })

  it('explains filtered counts against the currently loaded opportunity window', async () => {
    fetchMock.mockReturnValue(resp({
      opportunities: [
        { id: 'proposal', name: 'Proposal-stage opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        { id: 'discovery', name: 'Discovery-stage opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
      ],
      summary: { total: 2, open: 2, won: 0, lost: 0, openValue: 16000, weightedPipeline: 8200 },
      sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
      readiness: {
        queueWindow: 'latest_500_created_at',
        pagination: 'cursor_by_created_at',
        latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
        nextCursor: '2026-07-04T00:00:00.000Z',
      },
    }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Showing 2 loaded opportunities · older opportunities available')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'proposal_sent')

    expect(screen.getByText('Showing 1 of 2 loaded opportunities for Proposal Sent · older opportunities available')).toBeInTheDocument()
  })

  it('does not render duplicate opportunity rows when an older page overlaps the current window', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'overlap', name: 'Retained overlap opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'overlap', name: 'Retained overlap opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
          { id: 'older', name: 'Older unique opportunity', stage: 'discovery', status: 'open', value_amount: 4000, probability: 25 },
        ],
        summary: { total: 2, open: 2, won: 0, lost: 0, openValue: 16000, weightedPipeline: 8200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-04T07:00:00.000Z',
          nextCursor: null,
        },
      }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Retained overlap opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older unique opportunity')).toBeInTheDocument()
    expect(screen.getAllByText('Retained overlap opportunity')).toHaveLength(1)
    expect(screen.getByText('Showing 2 loaded opportunities')).toBeInTheDocument()
    expect(screen.getByText('$8,200')).toBeInTheDocument()
    expect(screen.getByText('$16,000')).toBeInTheDocument()
  })

  it('keeps the current opportunity window visible when loading older opportunities fails', async () => {
    fetchMock
      .mockReturnValueOnce(resp({
        opportunities: [
          { id: 'newer', name: 'Newer retained opportunity', stage: 'proposal_sent', status: 'open', value_amount: 12000, probability: 60 },
        ],
        summary: { total: 1, open: 1, won: 0, lost: 0, openValue: 12000, weightedPipeline: 7200 },
        sourceOfTruth: { crm: 'crm_opportunities', billing: 'stripe', mode: 'forecast_only' },
        readiness: {
          queueWindow: 'latest_500_created_at',
          pagination: 'cursor_by_created_at',
          latestOpportunityUpdatedAt: '2026-07-05T08:45:00.000Z',
          nextCursor: '2026-07-04T00:00:00.000Z',
        },
      }))
      .mockReturnValueOnce(resp({ error: 'Failed to load older opportunities' }, false))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('Newer retained opportunity')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /load older opportunities/i }))

    expect(await screen.findByText('Older opportunities failed to load. Current page is still visible.')).toBeInTheDocument()
    expect(screen.getByText('Newer retained opportunity')).toBeInTheDocument()
    expect(screen.queryByText(/opportunity pipeline failed to load/i)).not.toBeInTheDocument()
  })

  it('shows an honest empty state when there are no opportunities', async () => {
    fetchMock.mockReturnValue(resp({ opportunities: [], summary: { total: 0, open: 0, won: 0, lost: 0, openValue: 0, weightedPipeline: 0 } }))
    render(<OpportunitiesPageClient />)
    expect(await screen.findByText('No opportunities yet')).toBeInTheDocument()
  })

  it('shows an honest error state (never a fake-empty pipeline) when the fetch fails', async () => {
    fetchMock.mockReturnValue(resp({ error: 'Failed to load opportunities' }, false))
    render(<OpportunitiesPageClient />)
    await waitFor(() =>
      expect(screen.getByText(/opportunity pipeline failed to load/i)).toBeInTheDocument(),
    )
  })
})
