import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AccountantPackDownload } from '../BASTab'
import type { BASQuarterSummary } from '@/lib/bookkeeper/types'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const quarter: BASQuarterSummary = {
  label: 'Q1 FY2025-26 (Jul-Sep 2025)',
  startDate: '2025-07-01',
  endDate: '2025-09-30',
  label1A_totalSalesCents: 0,
  label1B_gstOnSalesCents: 0,
  label7_totalPurchasesCents: 0,
  label9_gstOnPurchasesCents: 0,
  label11_gstPayableCents: 0,
  transactionCount: 0,
}

function csvResp(firstLine: string, ok = true) {
  return Promise.resolve({ ok, text: async () => `${firstLine}\nBusiness,Quarter\n` } as Response)
}

describe('AccountantPackDownload', () => {
  it('shows the amber mock warning badge when the server reports source: mock', async () => {
    fetchMock.mockReturnValue(csvResp('# source: mock — NOT real financials'))

    render(<AccountantPackDownload business="dr" quarter={quarter} />)

    expect(await screen.findByText('Preview data — mock, Xero not connected')).toBeInTheDocument()
    // The three download links are present regardless of source.
    expect(screen.getByText('BAS summary')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
  })

  it('shows a quiet Xero source note (not the mock warning) when the server reports source: xero', async () => {
    fetchMock.mockReturnValue(csvResp('# source: xero'))

    render(<AccountantPackDownload business="dr" quarter={quarter} />)

    expect(await screen.findByText('Source: Xero')).toBeInTheDocument()
    expect(screen.queryByText('Preview data — mock, Xero not connected')).not.toBeInTheDocument()
  })

  it('renders no source badge when the probe fails — never guesses a source', async () => {
    fetchMock.mockReturnValue(Promise.reject(new Error('network down')))

    render(<AccountantPackDownload business="dr" quarter={quarter} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByText('Preview data — mock, Xero not connected')).not.toBeInTheDocument()
    expect(screen.queryByText('Source: Xero')).not.toBeInTheDocument()
    // Links still work without a known source.
    expect(screen.getByText('BAS summary')).toBeInTheDocument()
  })
})
