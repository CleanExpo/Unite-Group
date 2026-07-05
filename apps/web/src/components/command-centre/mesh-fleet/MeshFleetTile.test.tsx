import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MeshFleetTile } from './MeshFleetTile'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('MeshFleetTile', () => {
  it('renders machines with fresh/stale badges, state, current task, and ship count', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        machines: [
          { host: 'mac-mini', last_seen: '2026-07-05T02:00:00Z', is_stale: false, state: 'working', current_task: 'shipping UNI-2305' },
          { host: 'windows-box', last_seen: '2026-07-04T20:00:00Z', is_stale: true },
        ],
        shipCount: 3,
        source: 'pi_ceo_live',
      }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByTestId('mesh-machine-mac-mini')).toBeInTheDocument())
    expect(screen.getByText('mac-mini', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('shipping UNI-2305', { exact: false })).toBeInTheDocument()
    expect(screen.getByTestId('mesh-badge-mac-mini')).toHaveTextContent('fresh')
    expect(screen.getByTestId('mesh-badge-windows-box')).toHaveTextContent('stale')
    expect(screen.getByText('2 machines · 3 ships', { exact: false })).toBeInTheDocument()
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

  it('surfaces a degraded banner when the upstream reports an error state', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ configured: true, machines: [], shipCount: 0, source: 'upstream_error', error: 'HTTP 503' }),
    } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/Mesh Fleet/)
  })

  it('surfaces a degraded banner when the fetch itself fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as unknown as Response)

    render(<MeshFleetTile />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
