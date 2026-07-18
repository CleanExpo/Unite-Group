import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LiveMachineGrid } from './LiveMachineGrid'

const machines = [
  {
    deviceId: 'unite-mac-mini',
    label: 'Unite Mac Mini',
    platform: 'macOS',
    role: 'Primary orchestration host',
    connection: 'connected',
    lastSeenAt: '2026-07-18T10:00:00.000Z',
    screens: [
      {
        screenId: 'primary',
        label: 'Screen 1',
        state: 'active',
        activity: 'coding',
        tool: 'hermes',
        agent: 'default',
        projectKey: 'unite-group',
        taskRef: 'UNI-2403',
        lastSeenAt: '2026-07-18T10:00:00.000Z',
      },
      {
        screenId: 'secondary',
        label: 'Screen 2',
        state: 'idle',
        activity: 'idle',
        tool: null,
        agent: 'empire',
        projectKey: 'pi-ceo',
        taskRef: null,
        lastSeenAt: '2026-07-18T10:00:00.000Z',
      },
    ],
  },
  ...['phill-macbook-pro', 'phill-desktop'].map((deviceId, index) => ({
    deviceId,
    label: index === 0 ? 'Phill’s MacBook Pro' : 'Phill Desktop',
    platform: index === 0 ? 'macOS' : 'Windows',
    role: index === 0 ? 'Mobile command host' : 'Desktop execution host',
    connection: index === 0 ? 'stale' : 'offline',
    lastSeenAt: '2026-07-18T09:50:00.000Z',
    screens: ['primary', 'secondary'].map((screenId, screenIndex) => ({
      screenId,
      label: `Screen ${screenIndex + 1}`,
      state: index === 0 ? 'stale' : 'offline',
      activity: 'unknown',
      tool: null,
      agent: null,
      projectKey: null,
      taskRef: null,
      lastSeenAt: '2026-07-18T09:50:00.000Z',
    })),
  })),
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('LiveMachineGrid', () => {
  it('renders the fixed three-machine, six-screen safe topology', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ source: 'connected', generatedAt: '2026-07-18T10:00:05.000Z', machines }),
    } as Response)

    render(<LiveMachineGrid />)

    await waitFor(() => expect(screen.getAllByTestId(/^machine-screen-/)).toHaveLength(6))
    expect(screen.getByText('Unite Mac Mini')).toBeInTheDocument()
    expect(screen.getByText('Phill’s MacBook Pro')).toBeInTheDocument()
    expect(screen.getByText('Phill Desktop')).toBeInTheDocument()
    expect(screen.getByText('UNI-2403')).toBeInTheDocument()
    expect(screen.queryByText('private client portal')).not.toBeInTheDocument()
  })

  it('never renders stale or offline screen lanes as active', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ source: 'connected', generatedAt: '2026-07-18T10:00:05.000Z', machines }),
    } as Response)

    render(<LiveMachineGrid />)
    const stale = await screen.findByTestId('machine-phill-macbook-pro')
    const offline = screen.getByTestId('machine-phill-desktop')
    expect(within(stale).queryByText('active', { exact: true })).not.toBeInTheDocument()
    expect(within(offline).queryByText('active', { exact: true })).not.toBeInTheDocument()
    expect(within(stale).getAllByText('stale')).toHaveLength(3)
    expect(within(offline).getAllByText('offline')).toHaveLength(3)
  })

  it('shows an honest fixed not-reporting state when the source is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        source: 'not_connected',
        reason: 'migration_not_applied',
        generatedAt: '2026-07-18T10:00:05.000Z',
        machines: machines.map((machine) => ({
          ...machine,
          connection: 'not_reporting',
          lastSeenAt: null,
          screens: machine.screens.map((slot) => ({ ...slot, state: 'not_reporting', lastSeenAt: null })),
        })),
      }),
    } as Response)

    render(<LiveMachineGrid />)
    await waitFor(() => expect(screen.getAllByTestId(/^machine-screen-/)).toHaveLength(6))
    expect(screen.getAllByText('not reporting')).toHaveLength(9)
    expect(screen.getByRole('alert')).toHaveTextContent(/migration not applied/i)
  })
})
