import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

import { InsightIssueLink } from '../InsightIssueLink'

// InsightIssueLink takes an `insightId` prop, so it cannot be driven by the
// fixture sweep (`driveFixture` mounts with no props). This is the
// per-component equivalent, following boardroom/__tests__/DecisionLog.test.tsx.
//
// WHY THIS SURFACE IS NOT THE STANDARD retain-mark-disable SHAPE
//
// A failed read leaves `link === null`, and the component reads null as "this
// insight has no Linear issue yet" — a positive claim, not an absence of data.
// On that claim it offered a live "Create Linear issue" button, which can raise
// a duplicate of an issue that already exists. A DISABLED button would still
// assert the claim, so the fix withholds it entirely until a read has answered.
// The assertions below are therefore about the button NOT EXISTING, not about
// it being disabled. [UNI-2486]

const LINK = {
  linear_issue_id: 'UNI-9999',
  linear_issue_url: 'https://linear.app/unite-group/issue/UNI-9999',
  autonomous: false,
}

function countPosts(fetchMock: ReturnType<typeof vi.fn>): number {
  return fetchMock.mock.calls.filter(
    (call) => (call[1] as { method?: string } | undefined)?.method === 'POST',
  ).length
}

beforeEach(() => {
  vi.clearAllMocks()
})

// restoreAllMocks rather than clearAllMocks: the stubbed global `fetch` must be
// torn down between cases, or a later test inherits the previous case's mock
// and passes for the wrong reason.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InsightIssueLink — a failed read must not offer a write [UNI-2486]', () => {
  // MUTATION CONTROL. Restore the read's `.catch(() => {})` (drop `loadError`
  // and the unknown-state branch) and this case fails two independent ways:
  // the Create button reappears, and no `role="alert"` is rendered.
  it('withholds the Create button entirely when the link read rejects', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network down') })
    vi.stubGlobal('fetch', fetchMock)

    render(<InsightIssueLink insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByText(/create linear issue/i)).toBeNull()
    expect(screen.getByText(/failed read, not a confirmed absence/i)).toBeInTheDocument()
    expect(countPosts(fetchMock)).toBe(0)
  })

  // A 500 returns an HTML body, so `.json()` throws — but before the fix there
  // was no `res.ok` check at all, and that throw landed in the same swallow.
  it('treats a non-ok read as unknown, not as "no issue exists"', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<InsightIssueLink insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByText(/create linear issue/i)).toBeNull()
    expect(countPosts(fetchMock)).toBe(0)
  })

  // NEGATIVE CONTROL. Without this, "never render Create" would pass the two
  // cases above. A read that genuinely reports no link must still offer it.
  it('offers the Create button when the read succeeds with no link', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ link: LINK }) }
      }
      return { ok: true, status: 200, json: async () => ({ link: null }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<InsightIssueLink insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByText(/create linear issue/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).toBeNull()

    // …and the write path still works end to end: exactly one POST.
    fireEvent.click(screen.getByText(/create linear issue/i))
    fireEvent.change(screen.getByPlaceholderText(/what done looks like/i), {
      target: { value: 'Ships behind a flag' },
    })
    fireEvent.click(screen.getByText(/^create issue$/i))

    await waitFor(() => {
      expect(countPosts(fetchMock)).toBe(1)
    })
  })

  it('renders the existing link when the read reports one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ link: LINK }),
    })))

    render(<InsightIssueLink insightId="i1" />)

    await waitFor(() => {
      expect(screen.getByText('UNI-9999')).toBeInTheDocument()
    })
    expect(screen.queryByText(/create linear issue/i)).toBeNull()
  })

  it('recovers to the real answer when retry succeeds', async () => {
    let failNext = true
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (failNext) throw new Error('network down')
      return { ok: true, status: 200, json: async () => ({ link: LINK }) }
    }))

    render(<InsightIssueLink insightId="i1" />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    failNext = false
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    // The recovered read reports an EXISTING issue — the very thing the
    // withheld Create button would have duplicated.
    await waitFor(() => {
      expect(screen.getByText('UNI-9999')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // The in-flight case. The fixture sweep catches clear-on-entry with its
  // stage-2b assertion; a per-component test has no such stage, so it is
  // written by hand. Moving `setLoadError(null)` to loader entry fails exactly
  // this case — the Create button would flash back on screen mid-read.
  it('does not drop the unknown state while a retry is still in flight', async () => {
    let release: (() => void) | null = null
    let failNext = true

    vi.stubGlobal('fetch', vi.fn(async () => {
      if (failNext) throw new Error('network down')
      await new Promise<void>((resolve) => { release = resolve })
      return { ok: true, status: 200, json: async () => ({ link: null }) }
    }))

    render(<InsightIssueLink insightId="i1" />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    failNext = false
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(release).not.toBeNull())
    // Still unknown: no write control may appear before the answer arrives.
    expect(screen.queryByText(/create linear issue/i)).toBeNull()

    release!()
    await waitFor(() => {
      expect(screen.getByText(/create linear issue/i)).toBeInTheDocument()
    })
  })
})
