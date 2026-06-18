import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { CoachBriefs } from '../CoachBriefs'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CoachBriefs — honest error vs empty', () => {
  it('shows an honest error (not empty coach cards) when the fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)

    render(<CoachBriefs />)

    await waitFor(() => {
      expect(screen.getByText(/coach briefs unavailable/i)).toBeDefined()
    })
    // A failed load must NOT render as empty cards / "no briefs" (No-Invaders #1).
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('renders coach cards on a successful (even empty) load — not an error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reports: [] }) } as Response)

    render(<CoachBriefs />)

    await waitFor(() => {
      expect(screen.getByText('Daily Coaches')).toBeDefined()
    })
    // A successful empty load is not an error.
    expect(screen.queryByText(/coach briefs unavailable/i)).toBeNull()
  })
})
