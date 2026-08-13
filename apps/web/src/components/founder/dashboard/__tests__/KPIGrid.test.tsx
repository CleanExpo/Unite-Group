// src/components/founder/dashboard/__tests__/KPIGrid.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { KPIGrid } from '../KPIGrid'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, className, style }: any) => <div className={className} style={style}>{children}</div> },
}))

// Values that appear ONLY if the batch payload was adopted. The per-card
// fallback endpoints are left permanently pending so the batch is the sole
// possible source of rendered data — no race between the two paths.
const BATCH_KPIS = {
  dr: { revenueCents: 111100, growth: 0, invoiceCount: 1, activeIssues: 99, source: 'xero' as const },
  nrpg: {}, carsi: {}, restore: {}, synthex: {}, ato: {}, ccw: {},
}

function mockFetch(batch: { ok: boolean; status: number; body: unknown }) {
  return vi.fn(async (url: string) => {
    if (url.startsWith('/api/dashboard/kpi')) {
      return { ok: batch.ok, status: batch.status, json: async () => batch.body }
    }
    return new Promise(() => {}) // per-card fallbacks never settle
  })
}

describe('KPIGrid', () => {
  beforeEach(() => { vi.resetAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // CONTROL. A degraded batch response still carries a `kpis` object, so parsing
  // the body regardless of status presented a failed read as data.
  it('does not adopt the payload when the batch endpoint reports failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = mockFetch({
      ok: false,
      status: 500,
      body: { kpis: BATCH_KPIS, error: 'Failed to load dashboard KPIs', linearDegraded: true },
    }) as any

    render(<KPIGrid />)

    await waitFor(() => { expect(errorSpy).toHaveBeenCalled() })
    expect(screen.queryByText('99 active issues')).not.toBeInTheDocument()
    expect(screen.queryByText('$1,111')).not.toBeInTheDocument()
  })

  // NEGATIVE CONTROL: the healthy path must still render real batch data —
  // otherwise "never adopt the payload" would satisfy the control above while
  // breaking the dashboard.
  it('renders batch data when the batch endpoint succeeds', async () => {
    global.fetch = mockFetch({ ok: true, status: 200, body: { kpis: BATCH_KPIS } }) as any

    render(<KPIGrid />)

    await waitFor(() => {
      expect(screen.getByText('99 active issues')).toBeInTheDocument()
    })
    expect(screen.getByText('$1,111')).toBeInTheDocument()
  })
})
