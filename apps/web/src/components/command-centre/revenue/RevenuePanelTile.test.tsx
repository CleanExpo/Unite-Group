import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RevenuePanelTile, RevenuePanelView } from './RevenuePanelTile'
import type { RevenueResponse } from '@/lib/revenue/revenue-snapshot'

const READ_AT = '2026-09-24T02:00:00.000Z'

function snapshot(over: Partial<RevenueResponse> = {}): RevenueResponse {
  return {
    week: { startDate: '2026-09-21', endDate: '2026-09-27', timeZone: 'Australia/Sydney' },
    accounts: [],
    combined: {
      weekNetCents: 0,
      complete: true,
      verdict: 'below_break_even',
      breakEvenCents: 323_300,
      marginTargetCents: 647_000,
      gapToBreakEvenCents: 323_300,
      gapToMarginCents: 647_000,
    },
    cachedAt: READ_AT,
    definition: 'Cleared = available charge/payment.',
    ...over,
  }
}

const emptyOk = {
  account: 'synthex' as const,
  label: 'Synthex',
  status: 'ok' as const,
  readAt: READ_AT,
  cleared: {
    currency: 'aud',
    weekNetCents: 0,
    weekGrossCents: 0,
    weekFeeCents: 0,
    weekCount: 0,
    byBusiness: [],
    trend: [],
    lastPayments: [],
    nonAudExcludedCount: 0,
  },
  mrr: { rows: [], totalCents: 0, nonAudExcludedCount: 0 },
  truncated: false,
  sessionsScanned: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('RevenuePanelView', () => {
  it('a successful read with zero payments says "$0 — read OK at <time>"', () => {
    render(<RevenuePanelView data={snapshot({ accounts: [emptyOk] })} />)
    const week = screen.getByTestId('revenue-week-synthex')
    expect(week.textContent).toMatch(/^\$0 — read OK at /)
    expect(screen.queryByText(/NOT CONNECTED/)).not.toBeInTheDocument()
  })

  it('a failed account is NOT CONNECTED with its reason and shows no $ figure', () => {
    render(
      <RevenuePanelView
        data={snapshot({
          accounts: [{ account: 'agency', label: 'Agency', status: 'not_connected', reason: 'missing_key', readAt: READ_AT }, emptyOk],
          combined: { ...snapshot().combined, complete: false, verdict: 'partial' },
        })}
      />,
    )
    const section = screen.getByTestId('revenue-account-agency')
    expect(screen.getByTestId('revenue-not-connected-agency').textContent).toMatch(/NOT CONNECTED — key not set/)
    expect(section.textContent).not.toMatch(/\$/)
    expect(screen.getByTestId('revenue-verdict').textContent).toMatch(/PARTIAL/)
    expect(screen.getByTestId('revenue-combined').textContent).toMatch(/^at least /)
  })

  it('charts the account trend as an SVG area chart when the read has cleared funds', () => {
    const withTrend = {
      ...emptyOk,
      cleared: {
        ...emptyOk.cleared,
        trend: [
          { date: '2026-09-23', netCents: 10_000 },
          { date: '2026-09-24', netCents: 25_000 },
        ],
      },
    }
    const { container } = render(<RevenuePanelView data={snapshot({ accounts: [withTrend] })} />)
    const section = screen.getByTestId('revenue-account-synthex')
    expect(section.querySelector('[data-testid="revenue-trend-line"]')).not.toBeNull()
    expect(section.querySelector('[data-testid="revenue-trend-latest"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="revenue-trend-latest"]')).toHaveLength(1)
  })

  it('an empty trend and a NOT CONNECTED account render no chart path', () => {
    const { container } = render(
      <RevenuePanelView
        data={snapshot({
          accounts: [{ account: 'agency', label: 'Agency', status: 'not_connected', reason: 'auth_failed', readAt: READ_AT }, emptyOk],
          combined: { ...snapshot().combined, complete: false, verdict: 'partial' },
        })}
      />,
    )
    expect(container.querySelector('path')).toBeNull()
    expect(screen.getByTestId('revenue-not-connected-agency').textContent).toMatch(/NOT CONNECTED — Stripe rejected the key/)
    expect(screen.getByTestId('revenue-account-synthex').textContent).toMatch(/No cleared funds in the last 7 days \(read OK\)/)
  })
})

describe('RevenuePanelTile', () => {
  it('route failure renders NOT CONNECTED, not an empty panel', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    render(<RevenuePanelTile />)
    await waitFor(() => expect(screen.getByText(/NOT CONNECTED — revenue route failed/)).toBeInTheDocument())
  })
})
