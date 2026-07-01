import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { VaultEntry } from '../VaultEntry'

const baseProps = {
  id: 'v1',
  label: 'AWS root',
  username: 'root@unite',
  businessColor: '#16a34a',
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VaultEntry — delete failure is surfaced (UNI-2221)', () => {
  it('does nothing when the confirm() is cancelled', () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const onDelete = vi.fn()

    render(<VaultEntry {...baseProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('surfaces a visible error when the DELETE fails (non-ok) — never silent', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const onDelete = vi.fn()

    render(<VaultEntry {...baseProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/delete failed/i)).toBeInTheDocument()
    // A failed delete must NOT optimistically remove the entry from the UI.
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('surfaces a visible error when the DELETE rejects (network) — never silent', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const onDelete = vi.fn()

    render(<VaultEntry {...baseProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('calls onDelete and shows no error on a successful delete', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    const onDelete = vi.fn()

    render(<VaultEntry {...baseProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('v1')
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
