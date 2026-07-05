// Smoke test for the Hub Status tile after its port onto the command deck (UNI-2306).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { HubStatusWidget } from '../HubStatusWidget'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HubStatusWidget', () => {
  it('renders loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
    render(<HubStatusWidget />)
    expect(screen.getByText('Hub Status')).toBeDefined()
    expect(screen.getByText(/Loading satellites/i)).toBeDefined()
  })

  it('renders satellites after fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        satellites: [
          {
            id: 's1',
            business_key: 'dr',
            business_name: 'Disaster Recovery',
            health_status: 'green',
            open_linear_issues: 0,
            last_macas_verdict_date: null,
            last_bookkeeper_run_date: null,
            last_swept_at: '2026-07-01T00:00:00Z',
            repo_url: null,
            stack: 'Next.js',
          },
        ],
      }),
    })

    render(<HubStatusWidget />)

    await waitFor(() => {
      expect(screen.getByText('Disaster Recovery')).toBeDefined()
    })
    expect(screen.getByText('Healthy')).toBeDefined()
  })

  it('renders an honest error state when the hub status endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    render(<HubStatusWidget />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load hub status/i)).toBeDefined()
    })
  })
})
