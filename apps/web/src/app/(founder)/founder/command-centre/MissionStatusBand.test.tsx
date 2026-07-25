import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MissionStatusBand } from './MissionStatusBand'

// Route the two live endpoints to distinct fixtures. The band fetches both
// mesh-fleet (fleet heartbeats) and live-agent-operations (agent sessions).
function mockFetch(handlers: Record<string, unknown>, opts: { rejectUrl?: string } = {}) {
  vi.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (opts.rejectUrl && url.includes(opts.rejectUrl)) {
      return Promise.reject(new Error('network_down'))
    }
    const key = Object.keys(handlers).find((k) => url.includes(k))
    return Promise.resolve({
      ok: true,
      json: async () => (key ? handlers[key] : {}),
    } as unknown as Response)
  }) as typeof fetch)
}

const OPS_IDLE = {
  summary: { agents: 0, activeSessions: 0, openTasks: 0, blockedTasks: 0, approvalRequired: 0, recentShips: 0 },
  nextAction: 'idle',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('MissionStatusBand', () => {
  it('renders fleet heartbeats (safe state, no current_task) and active agent sessions', async () => {
    mockFetch({
      'mesh-fleet': {
        configured: true,
        machines: [
          { host: 'macbook', last_seen: new Date().toISOString(), is_stale: false, state: 'working' },
          { host: 'mac-mini', last_seen: new Date().toISOString(), is_stale: false, state: 'idle' },
          { host: 'windows-box', last_seen: '2026-07-04T20:00:00Z', is_stale: true, state: 'stale' },
        ],
        shipCount: 2,
        source: 'pi_ceo_live',
      },
      'live-agent-operations': {
        summary: { agents: 3, activeSessions: 2, openTasks: 5, blockedTasks: 1, approvalRequired: 0, recentShips: 4 },
        nextAction: 'review draft PR',
      },
    })

    render(<MissionStatusBand />)

    await waitFor(() => expect(screen.getByTestId('mission-fleet-count')).toHaveTextContent('03'))
    expect(screen.getByTestId('mission-fleet-summary')).toHaveTextContent('2 fresh · 1 stale · 2 ships in flight')
    // Safe state enum is rendered; free-text current_task is never present.
    expect(screen.getByTestId('mission-node-macbook')).toHaveTextContent('working')

    // Headline uses the payload's own activeSessions (2), not a node re-derivation.
    await waitFor(() => expect(screen.getByTestId('mission-agents-active')).toHaveTextContent('02'))
    expect(screen.getByTestId('mission-agents-summary')).toHaveTextContent('5 open · 1 blocked · 4 shipped')
    expect(screen.getByTestId('mission-agents-next')).toHaveTextContent('review draft PR')
  })

  it('shows an honest not-configured fleet state without fabricating nodes', async () => {
    mockFetch({
      'mesh-fleet': { configured: false, machines: [], shipCount: 0, source: 'not_configured' },
      'live-agent-operations': OPS_IDLE,
    })

    render(<MissionStatusBand />)

    await waitFor(() =>
      expect(screen.getByTestId('mission-fleet-summary')).toHaveTextContent('mesh not wired in this environment'),
    )
    expect(screen.queryByTestId('mission-node-macbook')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mission-degraded-down')).not.toBeInTheDocument()
  })

  it('treats an HTTP-200 degraded mesh body as a cold failure, not a stale seed', async () => {
    // The mesh route returns 200 with source=timeout on upstream failure. With
    // no prior success, the note must say "unavailable — no live data", never
    // "may be stale", and the count must be unknown ("--"), not fabricated 00.
    mockFetch({
      'mesh-fleet': { configured: true, machines: [], shipCount: 0, source: 'timeout', error: 'upstream_timeout' },
      'live-agent-operations': OPS_IDLE,
    })

    render(<MissionStatusBand />)

    await waitFor(() =>
      expect(screen.getByTestId('mission-degraded-down')).toHaveTextContent(/Mesh Fleet unavailable/),
    )
    expect(screen.queryByTestId('mission-degraded-stale')).not.toBeInTheDocument()
    expect(screen.getByTestId('mission-fleet-count')).toHaveTextContent('--')
  })

  it('reports an honest no-data failure when the fleet fetch itself rejects', async () => {
    mockFetch({ 'live-agent-operations': OPS_IDLE }, { rejectUrl: 'mesh-fleet' })

    render(<MissionStatusBand />)

    await waitFor(() =>
      expect(screen.getByTestId('mission-degraded-down')).toHaveTextContent(/Mesh Fleet unavailable/),
    )
  })
})
