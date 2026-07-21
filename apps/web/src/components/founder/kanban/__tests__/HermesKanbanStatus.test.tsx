import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HermesKanbanStatus } from '../HermesKanbanStatus'

const liveBoard = {
  configured: true,
  readOnly: true,
  authority: 'crm-cc_tasks',
  board: 'default',
  mode: 'cli',
  summary: { ready: 2, running: 1, blocked: 0, todo: 0, scheduled: 0, done: 12 },
  tasks: [
    {
      id: 't_176bb1b0',
      status: 'running',
      assignee: 'default',
      title: 'Hermes visibility projection',
      linearLink: {
        identifier: 'UNI-777',
        url: 'https://linear.app/unite-group/issue/UNI-777/test',
      },
    },
  ],
  lastSyncedAt: '2026-06-01T23:11:50.734Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('HermesKanbanStatus', () => {
  it('renders projection visibility, CRM authority, counts, and backlinks', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => liveBoard,
    } as unknown as Response)

    render(<HermesKanbanStatus />)

    await waitFor(() => expect(screen.getByText('Read-only live view')).toBeInTheDocument())
    expect(screen.getByText('Hermes projection visibility')).toBeInTheDocument()
    expect(screen.getByText(/CRM cc_tasks is the mission source of truth/)).toBeInTheDocument()
    expect(screen.getByText('Hermes visibility projection')).toBeInTheDocument()
    expect(screen.getByText('Linked: UNI-777')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View in Linear ↗' })).toHaveAttribute(
      'href',
      'https://linear.app/unite-group/issue/UNI-777/test',
    )
    expect(screen.getByRole('link', { name: 'Open CRM mission queue' })).toHaveAttribute(
      'href',
      '/founder/command-centre',
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/hermes/kanban')
  })

  it('exposes no projection mutation controls and performs GET only', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => liveBoard,
    } as unknown as Response)

    render(<HermesKanbanStatus />)
    await screen.findByText('Hermes visibility projection')

    for (const label of [
      /create hermes task/i,
      /block t_/i,
      /unblock t_/i,
      /complete t_/i,
      /link linear t_/i,
      /promote t_/i,
    ]) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
    expect(fetchMock.mock.calls.every(([, init]) => !init || init.method === undefined || init.method === 'GET')).toBe(true)
  })

  it('states when no CRM or Linear backlink was reported', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ...liveBoard,
        tasks: [{ ...liveBoard.tasks[0], linearLink: undefined }],
      }),
    } as unknown as Response)

    render(<HermesKanbanStatus />)

    await waitFor(() =>
      expect(screen.getByText('No CRM/Linear backlink reported.')).toBeInTheDocument(),
    )
  })

  it('shows an honest degraded state when projection loading fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        configured: false,
        readOnly: true,
        authority: 'crm-cc_tasks',
        board: 'default',
        summary: {},
        tasks: [],
        lastSyncedAt: '2026-06-01T23:11:50.734Z',
        error: 'hermes unavailable',
      }),
    } as unknown as Response)

    render(<HermesKanbanStatus />)

    await waitFor(() => expect(screen.getByText('Projection unavailable')).toBeInTheDocument())
    expect(screen.getByText('No open Hermes projection tasks were reported.')).toBeInTheDocument()
  })
})
