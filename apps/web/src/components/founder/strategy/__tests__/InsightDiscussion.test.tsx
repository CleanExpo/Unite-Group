import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

import { InsightDiscussion } from '../InsightDiscussion'

const COMMENT = {
  id: 'c-existing',
  insight_id: 'i1',
  author: 'ai' as const,
  content: 'Retained discussion note',
  created_at: '2026-08-01T00:00:00Z',
}

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

// restoreAllMocks, not clearAllMocks: `vi.stubGlobal('fetch', ...)` must be torn
// down between cases or a later test inherits the previous case's fetch and
// passes for the wrong reason.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

// The suite above drives the POST only; its mount GET is always healthy, which
// is exactly the gap UNI-2486 was filed against. These cases fail the READ.
describe('InsightDiscussion — a failed read is not an empty thread [UNI-2486]', () => {
  // MUTATION CONTROL. Restore the read `.catch(() => {})` (drop `loadError` and
  // the `!loadError` gate on the empty state) and this case fails two
  // independent ways: no `role="alert"` is rendered, and "No notes yet" comes
  // back on screen. It is the one assertion the pre-fix component cannot pass.
  it('does not fabricate "No notes yet" when the comments read fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))

    render(<InsightDiscussion insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/failed read, not an empty thread/i)).toBeInTheDocument()
    expect(screen.queryByText(/no notes yet/i)).toBeNull()
  })

  it('treats a non-ok read as a failed read, not an empty one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })))

    render(<InsightDiscussion insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByText(/no notes yet/i)).toBeNull()
  })

  // NEGATIVE CONTROL. Without this, "mark every empty thread as failed" would
  // pass the case above. A genuinely empty thread must still say so.
  it('still renders "No notes yet" when the read succeeds with zero comments', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ comments: [] }),
    })))

    render(<InsightDiscussion insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()
  })

  it('marks a retained thread stale when a later read fails, and clears on recovery', async () => {
    let failNext = false
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (failNext) throw new Error('refresh failed')
      return { ok: true, status: 200, json: async () => ({ comments: [COMMENT] }) }
    }))

    const { rerender } = render(<InsightDiscussion insightId="i1" />)
    await waitFor(() => {
      expect(screen.getByText('Retained discussion note')).toBeInTheDocument()
    })
    // Stage-1 negative control: a healthy read must NOT be marked.
    expect(document.querySelector('[data-stale-read="true"]')).toBeNull()

    // Re-read via the insightId dependency, with the read now failing.
    failNext = true
    rerender(<InsightDiscussion insightId="i2" />)

    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()
    })
    // Retained payload survives, marked rather than blanked.
    expect(screen.getByText('Retained discussion note')).toBeInTheDocument()
    expect(document.querySelector('[data-stale-read-notice="true"]')).not.toBeNull()
    // Send stays live: it appends a note, it does not act on a retained one.
    // Type first — Send is independently disabled on empty text, so asserting
    // against the untouched textarea would pass for the wrong reason.
    fireEvent.change(screen.getByPlaceholderText(/add a note/i), {
      target: { value: 'still able to write during an outage' },
    })
    expect(screen.getByLabelText('Send note')).not.toBeDisabled()

    // Stage 3: recovery clears the mark.
    failNext = false
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).toBeNull()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // The in-flight case. The fixture sweep catches clear-on-entry with its
  // stage-2b assertion; a per-component test has no such stage, so it is
  // written out by hand here. Moving `setLoadError(null)` to loader entry
  // fails exactly this case and nothing else.
  it('keeps the stale mark while a recovery read is still in flight', async () => {
    let release: (() => void) | null = null
    let failNext = false
    let holdNext = false

    vi.stubGlobal('fetch', vi.fn(async () => {
      if (failNext) throw new Error('refresh failed')
      if (holdNext) {
        await new Promise<void>((resolve) => { release = resolve })
      }
      return { ok: true, status: 200, json: async () => ({ comments: [COMMENT] }) }
    }))

    const { rerender } = render(<InsightDiscussion insightId="i1" />)
    await waitFor(() => expect(screen.getByText('Retained discussion note')).toBeInTheDocument())

    failNext = true
    rerender(<InsightDiscussion insightId="i2" />)
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()
    })

    // Retry, but hold the response open.
    failNext = false
    holdNext = true
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    // The mark must NOT drop merely because a read has started.
    await waitFor(() => expect(release).not.toBeNull())
    expect(document.querySelector('[data-stale-read="true"]')).not.toBeNull()

    release!()
    await waitFor(() => {
      expect(document.querySelector('[data-stale-read="true"]')).toBeNull()
    })
  })
})
