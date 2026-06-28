import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    }))

    render(<OpportunitiesPageClient />)

    expect(await screen.findByText('CARSI annual deal')).toBeInTheDocument()
    expect(screen.getByText('$7,200')).toBeInTheDocument() // weighted pipeline KPI
    expect(screen.getByText('CRM source: crm_opportunities')).toBeInTheDocument()
    expect(screen.getByText('Forecast only · Billing truth stays in Stripe')).toBeInTheDocument()
    expect(screen.getByText(/Proposal Sent · open/)).toBeInTheDocument() // the list row, not the filter <option>
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
