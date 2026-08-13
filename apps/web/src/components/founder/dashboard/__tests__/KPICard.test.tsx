// src/components/founder/dashboard/__tests__/KPICard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { KPICard } from '../KPICard'
import { BUSINESSES } from '@/lib/businesses'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, className, style }: any) => <div className={className} style={style}>{children}</div> },
}))

const DR = BUSINESSES.find(b => b.key === 'dr')!
const ATO = BUSINESSES.find(b => b.key === 'ato')!
const business = BUSINESSES.find(b => b.key === 'restore')!

const baseProps = {
  metric: '$24,750',
  metricLabel: 'Revenue MTD',
  trend: { value: '+12%', positive: true as const },
  secondary: '47 Claims · 3 Pending',
}

describe('KPICard', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('renders business name', () => {
    render(<KPICard business={DR} {...baseProps} />)
    expect(screen.getByText('Disaster Recovery')).toBeInTheDocument()
  })

  it('renders primary metric', () => {
    render(<KPICard business={DR} {...baseProps} />)
    expect(screen.getByText('$24,750')).toBeInTheDocument()
  })

  it('shows secondary prop text when no live keys provided', () => {
    render(<KPICard business={ATO} {...baseProps} secondary="Not yet launched" metric="—" />)
    expect(screen.getByText('Not yet launched')).toBeInTheDocument()
  })

  it('shows linear issue count in secondary when linearBusinessKey provided', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { revenueCents: 9900, growth: 5.2, invoiceCount: 3 }, source: 'mock' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ activeCount: 4 }) })

    render(
      <KPICard
        business={business}
        metric="—"
        metricLabel="Revenue MTD"
        trend={{ value: '—', positive: true }}
        secondary="Loading..."
        xeroBusinessKey="restore"
        linearBusinessKey="restore"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('4 active issues')).toBeInTheDocument()
    })
  })

  it('shows an honest error state when the revenue fetch throws — never a permanent "Loading…"', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))

    render(
      <KPICard
        business={business}
        metric="—"
        metricLabel="Revenue MTD"
        trend={{ value: '—', positive: true }}
        secondary="Loading..."
        xeroBusinessKey="restore"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/refresh to retry/i)
    })
    // The stale "Loading…" fallback must NOT persist after a hard failure.
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  // The test above covers a THROWN fetch. A non-OK STATUS took a different path
  // and was not covered: the response was mapped to `null`, which fell into the
  // "Xero not connected / no data" degrade branch and set `error: false`. A 500
  // therefore rendered the Demo badge and a permanent "Loading…" — the same
  // defect the test above forbids, reached by the other door. [UNI-2492]
  it('shows an honest error state when the revenue API returns 500 — not Demo/Loading', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Xero unavailable' }),
    })

    render(
      <KPICard
        business={business}
        metric="—"
        metricLabel="Revenue MTD"
        trend={{ value: '—', positive: true }}
        secondary="Loading..."
        xeroBusinessKey="restore"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/refresh to retry/i)
    })
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    // "Demo" would tell the founder they are looking at sample data. They are
    // looking at nothing, because the read failed.
    expect(screen.queryByText('Demo')).not.toBeInTheDocument()
  })

  // UNI-2373 H6 — mock boundary must surface end-to-end (API source → Demo badge).
  it('renders the Demo badge when the revenue API returns source: mock', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          businessKey: 'restore',
          revenueCents: 9900,
          expensesCents: 1000,
          growth: 5.2,
          invoiceCount: 3,
          lastUpdated: '2020-01-01T00:00:00.000Z',
        },
        source: 'mock',
      }),
    })

    render(
      <KPICard
        business={business}
        metric="—"
        metricLabel="Revenue MTD"
        trend={{ value: '—', positive: true }}
        secondary="Loading..."
        xeroBusinessKey="restore"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Demo')).toBeInTheDocument()
    })
    expect(screen.queryByText('Live')).not.toBeInTheDocument()
  })

  it('renders the Live badge only when the revenue API returns source: xero', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          businessKey: 'restore',
          revenueCents: 15_000_00,
          expensesCents: 5_000_00,
          growth: 12,
          invoiceCount: 9,
          lastUpdated: '2026-08-07T03:00:00.000Z',
        },
        source: 'xero',
      }),
    })

    render(
      <KPICard
        business={business}
        metric="—"
        metricLabel="Revenue MTD"
        trend={{ value: '—', positive: true }}
        secondary="Loading..."
        xeroBusinessKey="restore"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
    expect(screen.queryByText('Demo')).not.toBeInTheDocument()
  })
})
