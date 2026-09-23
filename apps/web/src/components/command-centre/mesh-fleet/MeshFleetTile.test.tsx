import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MeshFleetTile } from './MeshFleetTile'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('MeshFleetTile', () => {
  it('renders online/stale/offline badges, metrics, runtimes and claims without task text', async () => {
    const secondsAgo = (s: number) => new Date(Date.now() - s * 1000).toISOString()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        machines: [
          {
            host: 'mac-mini', last_seen: secondsAgo(5), is_stale: false, state: 'working',
            cpu_pct: 42.5, mem_pct: 61, load1: 1.25, agent_runtimes: ['claude', 'codex'], active_agents: 2,
          },
          { host: 'windows-box', last_seen: secondsAgo(120), is_stale: true },
          { host: 'old-laptop', last_seen: '2026-07-04T20:00:00Z', is_stale: true },
        ],
        shipCount: 3,
        claims: [{ linear_id: 'UNI-2305', machine: 'mac-mini', branch: 'feat/x', state: 'working' }],
        source: 'pi_ceo_live',
      }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByTestId('mesh-machine-mac-mini')).toBeInTheDocument())
    expect(screen.getByTestId('mesh-machine-mac-mini')).toHaveTextContent('mac-mini')
    expect(screen.queryByText('private client recovery details')).not.toBeInTheDocument()
    expect(screen.getByTestId('mesh-badge-mac-mini')).toHaveTextContent('online')
    expect(screen.getByTestId('mesh-badge-windows-box')).toHaveTextContent('stale')
    expect(screen.getByTestId('mesh-badge-old-laptop')).toHaveTextContent('offline')
    expect(screen.getByTestId('mesh-metrics-mac-mini')).toHaveTextContent(
      'CPU 42.5% · Mem 61% · Load 1.3 · Agents 2 · Runtimes claude, codex',
    )
    expect(screen.getByTestId('mesh-claim-UNI-2305')).toHaveTextContent('mac-mini · feat/x · working')
    expect(screen.getByText('3 machines · 3 ships', { exact: false })).toBeInTheDocument()
  })

  it('shows "—" for a missing metric, never 0', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        machines: [{ host: 'mac-mini', last_seen: new Date().toISOString(), is_stale: false, mem_pct: 0 }],
        shipCount: 0,
        source: 'pi_ceo_live',
      }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByTestId('mesh-metrics-mac-mini')).toBeInTheDocument())
    const metrics = screen.getByTestId('mesh-metrics-mac-mini')
    expect(metrics).toHaveTextContent('CPU — · Mem 0% · Load — · Agents — · Runtimes —')
  })

  it('renders a not-configured state when the env pair is absent', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false, machines: [], shipCount: 0, source: 'not_configured' }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByText(/not configured/i)).toBeInTheDocument())
    expect(screen.queryByTestId('mesh-machine-mac-mini')).not.toBeInTheDocument()
  })

  it('shows NOT CONNECTED (not an empty list or zeros) when the upstream read fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ configured: true, machines: [], shipCount: 0, source: 'upstream_error', error: 'HTTP 503' }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/Mesh Fleet/)
    expect(screen.getByTestId('mesh-not-connected')).toHaveTextContent('NOT CONNECTED')
    expect(screen.queryByText(/0 machines/)).not.toBeInTheDocument()
    expect(screen.queryByText(/No machines reporting/)).not.toBeInTheDocument()
  })

  it('shows NOT CONNECTED when the fetch itself fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByTestId('mesh-not-connected')).toHaveTextContent('NOT CONNECTED')
    expect(screen.queryByText(/not configured/i)).not.toBeInTheDocument()
  })
})
