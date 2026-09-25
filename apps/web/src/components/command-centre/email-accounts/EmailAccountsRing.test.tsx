import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmailAccountsRing, computeRingSegments, RING } from './EmailAccountsRing'
import { EmailAccountsTile } from './EmailAccountsTile'

const C = 2 * Math.PI * RING.radius

describe('computeRingSegments', () => {
  it('segment lengths sum to the circumference minus one gap per segment, proportional to counts', () => {
    const g = computeRingSegments({ connected: 2, needsReauth: 1, notConnected: 1 })!
    expect(g.circumference).toBeCloseTo(C, 6)
    expect(g.segments.map((s) => s.status)).toEqual(['connected', 'needs_reauth', 'not_connected'])
    const sum = g.segments.reduce((a, s) => a + s.length, 0)
    expect(sum).toBeCloseTo(C - 3 * RING.gap, 6)
    const usable = C - 3 * RING.gap
    expect(g.segments[0].length).toBeCloseTo(usable * (2 / 4), 6)
    expect(g.segments[1].length).toBeCloseTo(usable * (1 / 4), 6)
    expect(g.segments[2].length).toBeCloseTo(usable * (1 / 4), 6)
    // each segment starts after the previous segment plus one gap
    expect(g.segments[0].offset).toBeCloseTo(0, 6)
    expect(g.segments[1].offset).toBeCloseTo(g.segments[0].length + RING.gap, 6)
    expect(g.segments[2].offset).toBeCloseTo(g.segments[1].offset + g.segments[1].length + RING.gap, 6)
  })

  it('a zero-count status draws no segment', () => {
    const g = computeRingSegments({ connected: 3, needsReauth: 0, notConnected: 1 })!
    expect(g.segments.map((s) => s.status)).toEqual(['connected', 'not_connected'])
    expect(g.segments.reduce((a, s) => a + s.length, 0)).toBeCloseTo(C - 2 * RING.gap, 6)
    expect(g.segments[0].length).toBeCloseTo((C - 2 * RING.gap) * 0.75, 6)
  })

  it('a single non-zero status is a full closed circle with no gap', () => {
    const g = computeRingSegments({ connected: 0, needsReauth: 0, notConnected: 4 })!
    expect(g.segments).toHaveLength(1)
    expect(g.segments[0].length).toBeCloseTo(C, 6)
  })

  it('zero accounts returns null — no ring', () => {
    expect(computeRingSegments({ connected: 0, needsReauth: 0, notConnected: 0 })).toBeNull()
  })
})

describe('EmailAccountsRing', () => {
  it('draws one arc per non-zero status, centre label connected/total, and a legend with every count', () => {
    render(<EmailAccountsRing counts={{ connected: 2, needsReauth: 0, notConnected: 1 }} />)
    expect(screen.getAllByTestId(/^email-ring-seg-/)).toHaveLength(2)
    expect(screen.queryByTestId('email-ring-seg-needs_reauth')).toBeNull()
    expect(screen.getByTestId('email-ring-centre').textContent).toBe('2/3')
    expect(screen.getByText('working')).toBeTruthy()
    const legend = screen.getByTestId('email-ring-legend').textContent ?? ''
    expect(legend).toContain('Connected2')
    expect(legend).toContain('Needs re-auth0')
    expect(legend).toContain('Not connected1')
  })

  it('connected uses the go colour, never the action (--deck-cyan) colour', () => {
    render(<EmailAccountsRing counts={{ connected: 1, needsReauth: 1, notConnected: 1 }} />)
    const seg = screen.getByTestId('email-ring-seg-connected')
    expect(seg.getAttribute('stroke')).toBe('var(--deck-go, #2dbb57)')
    expect(screen.getByText('Connected').getAttribute('style')).toContain('var(--tile-green-txt, #34d399)')
    expect(screen.getByTestId('email-accounts-ring').innerHTML).not.toContain('--deck-cyan')
  })

  it('renders nothing for zero accounts', () => {
    const { container } = render(<EmailAccountsRing counts={{ connected: 0, needsReauth: 0, notConnected: 0 }} />)
    expect(container.innerHTML).toBe('')
  })
})

const payload = {
  source: 'cc:email-accounts',
  generatedAt: '2026-09-25T00:00:00.000Z',
  summary: { connected: 1, needsReauth: 1, notConnected: 1, total: 3 },
  providers: [
    { id: 'google', label: 'Google (Gmail)', state: 'connected', source: 'vault', lastActivityAt: null, detail: null },
    { id: 'microsoft', label: 'Microsoft', state: 'needs_reauth', source: 'vault', lastActivityAt: null, detail: null },
    { id: 'imap', label: 'IMAP', state: 'not_connected', source: 'none', lastActivityAt: null, detail: null },
  ],
}

function mockFetch(res: { ok: boolean; status?: number; body?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: res.ok, status: res.status ?? 200, json: async () => res.body })),
  )
}

describe('EmailAccountsTile ring', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('a live read draws the ring and keeps the per-account rows', async () => {
    mockFetch({ ok: true, body: payload })
    render(<EmailAccountsTile />)
    await waitFor(() => expect(screen.getByTestId('email-accounts-ring')).toBeTruthy())
    expect(screen.getByTestId('email-ring-centre').textContent).toBe('1/3')
    expect(screen.getByText('Google (Gmail)')).toBeTruthy()
    expect(screen.getByText('IMAP')).toBeTruthy()
  })

  it('a failed read keeps the honest error and draws no ring', async () => {
    mockFetch({ ok: false, status: 500 })
    render(<EmailAccountsTile />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HTTP 500'))
    expect(screen.queryByTestId('email-accounts-ring')).toBeNull()
  })

  it('a later failed poll removes the ring even though the old payload is retained', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload })
        .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
      vi.stubGlobal('fetch', fetchMock)
      render(<EmailAccountsTile />)
      await waitFor(() => expect(screen.getByTestId('email-accounts-ring')).toBeTruthy())
      await vi.advanceTimersByTimeAsync(120_000)
      await waitFor(() => expect(screen.getByText(/HTTP 503/)).toBeTruthy())
      expect(screen.getByTestId('email-accounts-tile').getAttribute('data-stale-read')).toBe('true')
      expect(screen.queryByTestId('email-accounts-ring')).toBeNull()
      // the stale roster stays, marked — the ring does not
      expect(screen.getByText('Google (Gmail)')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('zero accounts draws no ring', async () => {
    mockFetch({ ok: true, body: { ...payload, summary: { connected: 0, needsReauth: 0, notConnected: 0, total: 0 }, providers: [] } })
    render(<EmailAccountsTile />)
    await waitFor(() => expect(screen.getByTestId('email-accounts-tile').textContent).toContain('0 connected'))
    expect(screen.queryByTestId('email-accounts-ring')).toBeNull()
  })
})
