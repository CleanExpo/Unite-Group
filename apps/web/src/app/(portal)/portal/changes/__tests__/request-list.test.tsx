import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../actions', () => ({ approveChangeAction: vi.fn(), askForEditsAction: vi.fn(), submitChangeAction: vi.fn() }))

import type { ChangeRequest } from '@/lib/portal/changes/types'

import { RequestList } from '../request-list'

const base: ChangeRequest = {
  id: '11111111-1111-1111-1111-111111111111', tenantSlug: 'alpha', page: 'contact', requestText: 'New phone number',
  photoPath: null, status: 'submitted', previewUrl: null, editNote: null,
  createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z', approvedAt: null,
}

afterEach(cleanup)

describe('the request list', () => {
  it('shows Approve and Ask for edits only on a request whose preview is waiting', () => {
    render(<RequestList requests={[
      { ...base, id: 'a', status: 'submitted' },
      { ...base, id: 'b', status: 'preview_ready', previewUrl: 'https://preview.invalid/alpha/b' },
      { ...base, id: 'c', status: 'approved', previewUrl: 'https://preview.invalid/alpha/c' },
      { ...base, id: 'd', status: 'published', previewUrl: 'https://preview.invalid/alpha/d' },
    ]} />)
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Ask for edits' })).toHaveLength(1)
  })

  it('opens the preview in a new tab without giving it a handle on this page', () => {
    render(<RequestList requests={[{ ...base, status: 'preview_ready', previewUrl: 'https://preview.invalid/alpha/x' }]} />)
    const link = screen.getByRole('link', { name: 'Open the preview' })
    expect(link.getAttribute('href')).toBe('https://preview.invalid/alpha/x')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows plain status words and an Australian date', () => {
    render(<RequestList requests={[{ ...base, status: 'in_progress' }]} />)
    expect(screen.getByText('We are working on it')).toBeTruthy()
    expect(screen.getByText(/Sent 02\/11\/2026/)).toBeTruthy()
  })

  it('says so plainly when there are no requests yet', () => {
    render(<RequestList requests={[]} />)
    expect(screen.getByText(/No requests yet/)).toBeTruthy()
  })
})
