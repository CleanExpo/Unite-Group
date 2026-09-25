import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CostAllocationTile } from './CostAllocationTile'

const base = {
  period: { start: '2026-09-01', end: '2026-09-30' },
  sources: [
    { id: 'a', name: 'Anthropic', amount_aud: 300 },
    { id: 'b', name: 'Vercel', amount_aud: 100 },
  ],
  total_cost_aud: 400,
  total_revenue_aud: 250,
  prior_month_cost_aud: 200,
  metering: { state: 'collecting', fetchers_wired: 2 },
}

function mockFetch(res: { ok: boolean; status?: number; body?: unknown }) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: res.ok,
    status: res.status ?? 200,
    json: async () => res.body,
  })))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CostAllocationTile', () => {
  it('draws the cost split donut with the (negative) net in the centre and the month-on-month bars', async () => {
    mockFetch({ ok: true, body: base })
    const { container } = render(<CostAllocationTile />)
    await waitFor(() => expect(container.querySelector('[data-testid="cost-net"]')).not.toBeNull())
    expect(container.querySelector('[data-testid="cost-net"]')!.textContent).toBe('-$150.00')
    expect(container.querySelectorAll('[data-testid^="cost-slice-"]')).toHaveLength(2)
    expect(container.querySelector('[data-testid="mom-current"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="mom-prior"]')).not.toBeNull()
    // the per-source figures remain readable as text
    expect(container.textContent).toContain('Anthropic')
    expect(container.textContent).toContain('$300.00')
  })

  it('a failed read keeps the honest error state and draws no chart', async () => {
    mockFetch({ ok: false, status: 500 })
    const { container } = render(<CostAllocationTile />)
    await screen.findByText('HTTP 500')
    expect(container.querySelector('svg')).toBeNull()
    expect(container.textContent).not.toMatch(/\$0\.00/)
  })

  it('an all-zero dormant read keeps the metering copy and draws no chart', async () => {
    mockFetch({
      ok: true,
      body: {
        ...base,
        sources: [],
        total_cost_aud: 0,
        total_revenue_aud: 0,
        prior_month_cost_aud: 0,
        metering: { state: 'dormant', fetchers_wired: 0 },
      },
    })
    const { container } = render(<CostAllocationTile />)
    await screen.findByText(/Cost metering is dormant/)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('an unknown prior month draws no month-on-month chart and never shows it as $0', async () => {
    const { prior_month_cost_aud: _omit, ...withoutPrior } = base
    mockFetch({ ok: true, body: withoutPrior })
    const { container } = render(<CostAllocationTile />)
    await waitFor(() => expect(container.querySelector('[data-testid="cost-net"]')).not.toBeNull())
    expect(container.querySelector('[data-testid="mom-current"]')).toBeNull()
    expect(container.textContent).toMatch(/Prior month unknown/)
    expect(container.textContent).not.toMatch(/NaN/)
  })

  it('an unknown revenue figure draws no donut and never shows net as a number', async () => {
    const { total_revenue_aud: _omit, ...withoutRevenue } = base
    mockFetch({ ok: true, body: withoutRevenue })
    const { container } = render(<CostAllocationTile />)
    await waitFor(() => expect(container.querySelector('[data-testid="mom-current"]')).not.toBeNull())
    expect(container.querySelector('[data-testid="cost-net"]')).toBeNull()
    expect(container.textContent).toMatch(/Net unknown/)
    expect(container.textContent).not.toMatch(/NaN/)
  })
})
