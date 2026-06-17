import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Founder route (NOT /preview/) — so the preview fallback must never engage.
vi.mock('next/navigation', () => ({ usePathname: () => '/founder/knowledge-console' }))

import { KnowledgeConsoleClient } from '../KnowledgeConsoleClient'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('KnowledgeConsoleClient — no fabricated data on the founder route', () => {
  it('renders an honest error (no mock projects) when the projects API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText(/knowledge unavailable/i)).toBeDefined()
    })
    // No-Invaders #1: a failed load must NOT render fabricated fallback projects as live data.
    expect(screen.queryByText('RestoreAssist')).toBeNull()
    expect(screen.queryByText('Synthex')).toBeNull()
    expect(screen.getByText('No project selected')).toBeDefined()
  })

  it('renders an honest empty state (no mock projects) when the API returns none', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ projects: [] }),
    } as Response)

    render(<KnowledgeConsoleClient />)

    await waitFor(() => {
      expect(screen.getByText('No project selected')).toBeDefined()
    })
    expect(screen.queryByText('RestoreAssist')).toBeNull()
    // A successful-but-empty load is not an error.
    expect(screen.queryByText(/knowledge unavailable/i)).toBeNull()
  })
})
