// src/components/founder/strategy/__tests__/InsightsBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { InsightsBoard } from '../InsightsBoard'

// BusinessFilter pulls its own data; stub it so this test isolates the board's
// fetch/error behaviour.
vi.mock('@/components/founder/kanban/BusinessFilter', () => ({
  BusinessFilter: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InsightsBoard', () => {
  it('renders the legitimate empty state when the request SUCCEEDS with no insights', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insights: [] }),
    })

    render(<InsightsBoard />)

    // Successful-but-empty: the honest scheduled-arrival hint, not an error.
    await waitFor(() => {
      expect(screen.getByText(/Insights arrive at 02:00 AEST/i)).toBeDefined()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an honest error state on fetch FAILURE — never a fabricated empty board', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<InsightsBoard />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.getByText(/unavailable — couldn’t load/i)).toBeDefined()

    // No-Invaders #1: a backend failure must NOT masquerade as a real empty CRM.
    expect(screen.queryByText(/Insights arrive at 02:00 AEST/i)).toBeNull()
    // The kanban column headers / zero-count pills must not render either.
    expect(screen.queryByText('NEW')).toBeNull()
    expect(screen.queryByText('DONE')).toBeNull()
  })

  it('renders an honest error state when the response is not ok (HTTP error)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    render(<InsightsBoard />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.getByText(/unavailable — couldn’t load/i)).toBeDefined()
    expect(screen.queryByText(/Insights arrive at 02:00 AEST/i)).toBeNull()
  })
})
