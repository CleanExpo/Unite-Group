import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { CoachBriefs } from '../CoachBriefs'
import type { CoachReport } from '@/lib/coaches/types'

beforeEach(() => {
  vi.clearAllMocks()
})

function report(overrides: Partial<CoachReport>): CoachReport {
  return {
    id: 'r1',
    founder_id: 'f1',
    coach_type: 'life',
    business_key: null,
    report_date: '2026-07-06',
    status: 'completed',
    brief_markdown: '## Today at a Glance\n- All quiet',
    raw_data: null,
    metrics: null,
    input_tokens: null,
    output_tokens: null,
    model: null,
    duration_ms: null,
    error_message: null,
    created_at: '2026-07-06T00:00:00Z',
    updated_at: '2026-07-06T00:00:00Z',
    ...overrides,
  }
}

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

describe('CoachBriefs — mock/live source badge (UNI-2283)', () => {
  it('renders a "seed" source badge for a mock-data report, not just the LLM prompt caveat', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [report({ raw_data: { source: 'mock' } })] }),
    } as Response)

    render(<CoachBriefs />)

    await waitFor(() => {
      expect(screen.getByText('Daily Coaches')).toBeDefined()
    })
    // Query inside waitFor — the badge commits in a later flush than the header, so a
    // bare query races the state update under full-suite CPU load (passes in isolation).
    await waitFor(() => {
      expect(document.querySelector('[data-source-mode="seed"]')).not.toBeNull()
    })
  })

  it('renders a "live" source badge for a live-data report', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [report({ raw_data: { source: 'live' } })] }),
    } as Response)

    render(<CoachBriefs />)

    await waitFor(() => {
      expect(screen.getByText('Daily Coaches')).toBeDefined()
    })
    // Query inside waitFor — see the "seed" case above (badge commits after the header).
    await waitFor(() => {
      expect(document.querySelector('[data-source-mode="live"]')).not.toBeNull()
    })
  })

  it('renders no source badge when the report carries no provenance signal', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [report({ raw_data: null })] }),
    } as Response)

    render(<CoachBriefs />)

    await waitFor(() => {
      expect(screen.getByText('Daily Coaches')).toBeDefined()
    })
    expect(document.querySelector('[data-source-mode]')).toBeNull()
  })
})
