// src/components/founder/advisory/tabs/__tests__/CasesTab.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { CasesTab } from '../CasesTab'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/advisory',
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CasesTab', () => {
  it('renders the legitimate empty state when the fetch SUCCEEDS but returns nothing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cases: [] }),
    })

    render(<CasesTab />)

    await waitFor(() => {
      expect(screen.getByText('No advisory cases yet')).toBeDefined()
    })
    // A successful-empty result is genuine — no error block.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an honest error state on fetch failure — never a fabricated empty CRM', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    render(<CasesTab />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.getByText(/unavailable — couldn’t load/i)).toBeDefined()
    // No-Invaders #1: a backend failure must NOT masquerade as a real empty state.
    expect(screen.queryByText('No advisory cases yet')).toBeNull()
    expect(screen.queryByText(/Create your first case/i)).toBeNull()
  })

  it('renders an honest error state when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<CasesTab />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.queryByText('No advisory cases yet')).toBeNull()
  })
})
