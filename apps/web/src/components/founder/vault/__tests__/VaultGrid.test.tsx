// src/components/founder/vault/__tests__/VaultGrid.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { VaultGrid } from '../VaultGrid'

// VaultEntry/VaultAddEntry are not under test here — keep the tree shallow.
vi.mock('../VaultEntry', () => ({ VaultEntry: () => null }))
vi.mock('../VaultAddEntry', () => ({ VaultAddEntry: () => null }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VaultGrid', () => {
  it('renders successful empty state when fetch succeeds with no entries', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })

    render(<VaultGrid unlocked />)

    await waitFor(() => {
      expect(screen.getByText(/no credentials stored yet/i)).toBeDefined()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an honest error state on fetch failure — never a fabricated empty vault', async () => {
    // A failed query must NOT look like a real, empty vault (No-Invaders #1).
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    render(<VaultGrid unlocked />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.getByText(/vault unavailable/i)).toBeDefined()
    // The legitimate empty state must NOT render on failure.
    expect(screen.queryByText(/no credentials stored yet/i)).toBeNull()
  })

  it('renders an honest error state when fetch rejects — never a fabricated empty vault', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<VaultGrid unlocked />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
    expect(screen.queryByText(/no credentials stored yet/i)).toBeNull()
  })
})
