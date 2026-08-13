import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SixZoneCanvas } from './SixZoneCanvas'

function mockStatus(body: unknown, opts: { reject?: boolean } = {}) {
  vi.spyOn(global, 'fetch').mockImplementation((() =>
    opts.reject
      ? Promise.reject(new Error('network_down'))
      : Promise.resolve({ ok: true, json: async () => body } as unknown as Response)) as typeof fetch)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('SixZoneCanvas', () => {
  it('renders the host, each signal state verbatim and the observation freshness, and links the other five zones', async () => {
    mockStatus({
      configured: true,
      observedAt: new Date(Date.now() - 30_000).toISOString(),
      host: 'mac-mini',
      signals: [
        { id: 'hermes', label: 'Hermes', state: 'ready', detail: 'health endpoint responded' },
        { id: 'ollama', label: 'Ollama / Gemma', state: 'degraded', detail: 'local model service unavailable' },
        { id: 'storage', label: 'External storage', state: 'ready', detail: '4 GB free' },
        { id: 'mesh_heartbeat', label: 'Mesh heartbeat', state: 'unknown', detail: 'launch agent unavailable' },
      ],
    })

    render(<SixZoneCanvas work={{ queued: 4, blocked: 1, source: 'Linear', nextAction: 'Review receipt', error: false }} />)

    await waitFor(() => expect(screen.getByTestId('six-zone-host-name')).toHaveTextContent('mac-mini'))
    expect(screen.getByTestId('six-zone-host-freshness')).toHaveTextContent('observed 30s ago')
    expect(screen.getByTestId('six-zone-signal-hermes')).toHaveAttribute('data-state', 'ready')
    expect(screen.getByTestId('six-zone-signal-ollama')).toHaveAttribute('data-state', 'degraded')
    expect(screen.getByTestId('six-zone-signal-storage')).toHaveTextContent('4 GB free')
    expect(screen.getByTestId('six-zone-signal-mesh_heartbeat')).toHaveAttribute('data-state', 'unknown')
    expect(screen.queryByTestId('six-zone-host-error')).not.toBeInTheDocument()

    // Zones 2-6 are links only, pointing at decks that already exist.
    expect(screen.getByTestId('six-zone-link-operations')).toHaveAttribute('href', '/founder/command-centre/operations')
    expect(screen.getByTestId('six-zone-link-evidence')).toHaveAttribute(
      'href',
      '/founder/command-centre/operations#evidence-stream',
    )
    expect(screen.getByTestId('six-zone-link-fleet')).toHaveAttribute(
      'href',
      '/founder/command-centre/operations#agent-fleet',
    )
    expect(screen.getByTestId('six-zone-link-knowledge')).toHaveAttribute('href', '/founder/command-centre/knowledge')
    expect(screen.getByTestId('six-zone-link-providers')).toHaveAttribute('href', '/founder/command-centre/providers')
    expect(screen.getByTestId('six-zone-link-operations')).toHaveTextContent('4 queued · 1 blocked · Linear')
    expect(screen.getByTestId('six-zone-link-operations')).toHaveTextContent('next: Review receipt')
  })

  it('never badges a disabled local adapter as live', async () => {
    // The adapter returns configured:false with four 'unknown' signals when
    // MISSION_CONTROL_LOCAL_HOST_ADAPTER is unset. That is real data about an
    // UNAVAILABLE source — it must never render as a live reading.
    mockStatus({
      configured: false,
      observedAt: new Date().toISOString(),
      host: null,
      signals: [
        { id: 'hermes', label: 'Hermes', state: 'unknown', detail: 'local adapter not enabled' },
        { id: 'ollama', label: 'Ollama / Gemma', state: 'unknown', detail: 'local adapter not enabled' },
        { id: 'storage', label: 'External storage', state: 'unknown', detail: 'local adapter not enabled' },
        { id: 'mesh_heartbeat', label: 'Mesh heartbeat', state: 'unknown', detail: 'local adapter not enabled' },
      ],
    })

    render(<SixZoneCanvas work={{ queued: 0, blocked: 0, source: 'Linear', nextAction: null, error: false }} />)

    await waitFor(() => expect(screen.getByTestId('six-zone-host-name')).toHaveTextContent('host unknown'))
    const badge = screen.getByTestId('six-zone-host').querySelector('[data-source-mode]')
    expect(badge).toHaveAttribute('data-source-mode', 'degraded')
    expect(badge).not.toHaveAttribute('data-source-mode', 'live')
    for (const id of ['hermes', 'ollama', 'storage', 'mesh_heartbeat']) {
      expect(screen.getByTestId(`six-zone-signal-${id}`)).toHaveAttribute('data-state', 'unknown')
    }
  })

  it('falls back to unknown signals and no observation when the status read fails', async () => {
    mockStatus(null, { reject: true })

    render(<SixZoneCanvas work={{ queued: 0, blocked: 0, source: 'Linear', nextAction: null, error: true }} />)

    await waitFor(() => expect(screen.getByTestId('six-zone-host-error')).toHaveTextContent(/no live data/))
    expect(screen.getByTestId('six-zone-host-name')).toHaveTextContent('host unknown')
    expect(screen.getByTestId('six-zone-host-freshness')).toHaveTextContent('no observation')
    for (const id of ['hermes', 'ollama', 'storage', 'mesh_heartbeat']) {
      expect(screen.getByTestId(`six-zone-signal-${id}`)).toHaveAttribute('data-state', 'unknown')
    }
  })
})
