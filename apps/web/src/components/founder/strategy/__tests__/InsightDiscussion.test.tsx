import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { InsightDiscussion } from '../InsightDiscussion'

// The mount effect GETs existing comments; submit() POSTs a new one. Route the
// mock by HTTP method so we can fail only the POST.
function mockFetch(postResponse: { ok: boolean; body?: unknown }) {
  return vi.fn(async (_url: string, init?: { method?: string }) => {
    if (init?.method === 'POST') {
      return {
        ok: postResponse.ok,
        status: postResponse.ok ? 200 : 500,
        json: async () => postResponse.body ?? {},
      }
    }
    // Initial comments GET.
    return { ok: true, status: 200, json: async () => ({ comments: [] }) }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('InsightDiscussion — submit failure is surfaced (UNI-2221)', () => {
  async function typeAndSend() {
    const textarea = screen.getByPlaceholderText(/add a note/i)
    fireEvent.change(textarea, { target: { value: 'A strategic note' } })
    fireEvent.click(screen.getByLabelText('Send note'))
  }

  it('shows a visible error when the POST returns non-ok — never a silent no-op', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false }))

    render(<InsightDiscussion insightId="i1" />)
    await typeAndSend()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/could not post your note/i)).toBeInTheDocument()
    // The unsent text is preserved so the user can retry.
    expect((screen.getByPlaceholderText(/add a note/i) as HTMLTextAreaElement).value).toBe('A strategic note')
  })

  it('shows a visible error when the POST rejects (network)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') throw new Error('network down')
      return { ok: true, status: 200, json: async () => ({ comments: [] }) }
    }))

    render(<InsightDiscussion insightId="i1" />)
    await typeAndSend()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('appends the comment and shows no error on success', async () => {
    vi.stubGlobal('fetch', mockFetch({
      ok: true,
      body: { comment: { id: 'c1', insight_id: 'i1', author: 'founder', content: 'A strategic note', created_at: '2026-07-01T00:00:00Z' } },
    }))

    render(<InsightDiscussion insightId="i1" />)
    await typeAndSend()

    await waitFor(() => {
      expect(screen.getByText('A strategic note')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
