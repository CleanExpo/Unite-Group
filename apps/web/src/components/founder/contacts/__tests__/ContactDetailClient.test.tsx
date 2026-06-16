import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContactDetailClient } from '../ContactDetailClient'
import type { Contact } from '@/types/database'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const mockContact: Contact = {
  id: 'c1',
  founder_id: 'f1',
  business_id: 'dr',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  phone: '0400111222',
  company: 'Acme Pty Ltd',
  role: 'Director',
  status: 'client',
  tags: ['vip', 'priority'],
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

vi.stubGlobal('fetch', vi.fn())
const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

describe('ContactDetailClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    push.mockReset()
  })

  it('loads and renders the founder-scoped contact', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockContact })
    render(<ContactDetailClient id="c1" />)

    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith('/api/contacts/c1')
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Acme Pty Ltd')).toBeInTheDocument()
    expect(screen.getByText('client')).toBeInTheDocument()
    // tags render
    expect(screen.getByText('vip')).toBeInTheDocument()
  })

  it('shows a not-found state on 404 (e.g. another account’s contact)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Contact not found' }) })
    render(<ContactDetailClient id="missing" />)

    expect(await screen.findByText('Contact not found')).toBeInTheDocument()
  })

  it('shows an error + retry when the load fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })
    render(<ContactDetailClient id="c1" />)

    expect(await screen.findByText(/could not load this contact/i)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
