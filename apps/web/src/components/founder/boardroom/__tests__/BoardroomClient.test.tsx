// BoardroomClient — honest error state (UNI-2393).
// A failed meetings fetch must render an error banner, never the "no board
// meetings yet" empty state, and a failed poll must keep previously-loaded
// meetings on screen.

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BoardroomClient } from '../BoardroomClient'
import type { BoardMeeting } from '../MeetingCard'

// Sibling tabs are out of scope — keep the render surface to the meetings tab.
vi.mock('../MeetingCard', () => ({
  MeetingCard: ({ meeting }: { meeting: BoardMeeting }) => (
    <div data-testid="meeting-card">{meeting.id}</div>
  ),
}))
vi.mock('../GanttChart', () => ({ GanttChart: () => null }))
vi.mock('../DecisionLog', () => ({ DecisionLog: () => null }))
vi.mock('../TeamPanel', () => ({ TeamPanel: () => null }))
vi.mock('../DispatchPanel', () => ({ DispatchPanel: () => null }))

const MEETING: BoardMeeting = {
  id: 'meeting-1',
  meeting_date: '2026-07-16',
  status: 'new',
  agenda: {},
  brief_md: '',
  metrics: {},
  created_at: '2026-07-16T01:50:00Z',
}

describe('BoardroomClient', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders an error banner (not the empty state) when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    })))

    render(<BoardroomClient />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/board meetings unavailable/i)
    expect(screen.queryByText(/no board meetings yet/i)).not.toBeInTheDocument()
  })

  it('keeps previously-loaded meetings when a later refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ meetings: [MEETING] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'boom' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<BoardroomClient />)

    expect(await screen.findByTestId('meeting-card')).toHaveTextContent('meeting-1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /refresh meetings/i }))

    // The failed poll surfaces an honest banner AND retains the stale meetings.
    expect(await screen.findByRole('alert')).toHaveTextContent(/board meetings unavailable/i)
    expect(screen.getByTestId('meeting-card')).toHaveTextContent('meeting-1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
