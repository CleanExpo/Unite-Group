import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('dompurify', () => ({ default: { sanitize: (s: string) => s } }))
vi.mock('../ReplyComposer', () => ({ ReplyComposer: () => <div data-testid="reply-composer" /> }))

import { ThreadViewer } from '../ThreadViewer'

const thread = {
  id: 't-1',
  subject: 'Quote request',
  messages: [
    { id: 'm-1', from: 'client@acme.com', to: 'me@biz.com', date: 'd1', bodyHtml: null, bodyText: 'Hi', attachments: [], unread: false, labelIds: [] },
  ],
}

function mockFetch() {
  const calls: Array<{ url: string; body?: unknown }> = []
  global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (String(url).includes('/action')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => thread } as Response)
  })
  return calls
}

beforeEach(() => vi.restoreAllMocks())

describe('ThreadViewer — mark read / unread', () => {
  it('calls the action route with action:unread', async () => {
    const calls = mockFetch()
    render(<ThreadViewer threadId="t-1" account="me@biz.com" onArchive={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Quote request')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mark unread'))

    await waitFor(() => {
      const action = calls.find(c => c.url.includes('/action'))
      expect(action?.body).toMatchObject({ account: 'me@biz.com', action: 'unread' })
    })
  })

  it('calls the action route with action:read', async () => {
    const calls = mockFetch()
    render(<ThreadViewer threadId="t-1" account="me@biz.com" onArchive={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Quote request')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mark read'))

    await waitFor(() => {
      const action = calls.find(c => c.url.includes('/action'))
      expect(action?.body).toMatchObject({ account: 'me@biz.com', action: 'read' })
    })
  })
})
