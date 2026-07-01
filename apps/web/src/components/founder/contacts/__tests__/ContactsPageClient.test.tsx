// src/components/founder/contacts/__tests__/ContactsPageClient.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ContactsPageClient } from '../ContactsPageClient'

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const ONE_CONTACT = {
  id: 'c1', founder_id: 'f1', business_id: null,
  first_name: 'Jane', last_name: 'Doe', email: null, phone: null,
  company: null, role: null, status: 'lead', tags: [], metadata: {},
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

// GET /api/contacts returns one contact; DELETE resolves/rejects per `del`.
function fetchWithDelete(del: { ok: boolean; status?: number } | Error) {
  return vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      return del instanceof Error ? Promise.reject(del) : Promise.resolve(del)
    }
    return Promise.resolve({ ok: true, json: async () => ({ contacts: [ONE_CONTACT] }) })
  })
}

describe('ContactsPageClient', () => {
  it('renders the legitimate empty state when the fetch SUCCEEDS but returns no contacts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contacts: [] }),
    })

    render(<ContactsPageClient />)

    await waitFor(() => {
      expect(screen.getByText('No contacts yet')).toBeInTheDocument()
    })
    // A genuine empty success must NOT show the error alert.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an honest error state on fetch FAILURE — never a fabricated empty CRM', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<ContactsPageClient />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/contacts unavailable/i)).toBeInTheDocument()
    // No-Invaders #1: a broken backend must NOT look like a real empty CRM.
    expect(screen.queryByText('No contacts yet')).toBeNull()
    // No fabricated zero stat badges either.
    expect(screen.queryByText('Leads: 0')).toBeNull()
    expect(screen.queryByText('Prospects: 0')).toBeNull()
    expect(screen.queryByText('Clients: 0')).toBeNull()
  })

  it('renders an honest error state on a non-ok response — never a fabricated empty CRM', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    render(<ContactsPageClient />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/couldn’t load/i)).toBeInTheDocument()
    expect(screen.queryByText('No contacts yet')).toBeNull()
  })

  // UNI-2221 accessibility: the filter controls must have accessible names.
  it('gives the search and status filters programmatic labels', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: [{
          id: 'c1', founder_id: 'f1', business_id: null,
          first_name: 'Jane', last_name: 'Doe', email: null, phone: null,
          company: null, role: null, status: 'lead', tags: [], metadata: {},
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
        }],
      }),
    })

    render(<ContactsPageClient />)

    await waitFor(() => {
      expect(screen.getByLabelText('Search contacts')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
  })
})

describe('ContactsPageClient — delete contact (UNI-2220)', () => {
  it('requires confirmation: a dismissed confirm fires no DELETE and keeps the row', async () => {
    const fetchMock = fetchWithDelete({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<ContactsPageClient />)
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(confirmSpy).toHaveBeenCalled()
    // Destructive action must not fire without confirmation.
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/contacts/c1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('surfaces an error and KEEPS the row when the DELETE fails (no silent swallow)', async () => {
    global.fetch = fetchWithDelete({ ok: false, status: 500 }) as unknown as typeof fetch
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ContactsPageClient />)
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // Failure is surfaced (not swallowed) and the contact is not falsely removed.
    await waitFor(() => expect(screen.getByText(/could not delete/i)).toBeInTheDocument())
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('removes the row on a confirmed, successful delete', async () => {
    global.fetch = fetchWithDelete({ ok: true }) as unknown as typeof fetch
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ContactsPageClient />)
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Jane Doe')).toBeNull())
    expect(screen.queryByText(/could not delete/i)).toBeNull()
  })
})
