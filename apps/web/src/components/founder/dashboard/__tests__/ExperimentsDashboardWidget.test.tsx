// Smoke test for the Experiments tile after its port onto the command deck (UNI-2306).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { ExperimentsDashboardWidget } from '../ExperimentsDashboardWidget'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExperimentsDashboardWidget', () => {
  it('renders loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
    render(<ExperimentsDashboardWidget />)
    expect(screen.getByText('Experiments')).toBeDefined()
    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('renders active and completed counts after fetch', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.includes('status=active')
            ? [{ id: '1', title: 'A', status: 'active' }]
            : [
                { id: '2', title: 'B', status: 'completed', statistical_significance: 97 },
                { id: '3', title: 'C', status: 'completed', statistical_significance: 40 },
              ],
      }),
    )

    render(<ExperimentsDashboardWidget />)

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined()
    })
    expect(screen.getByText('Completed')).toBeDefined()
    // One completed experiment is statistically significant (>= 95).
    expect(screen.getByText(/ready for review/i)).toBeDefined()
  })
})
