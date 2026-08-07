// MeetingCard — the weekly review must actually be visible (UNI-2373 P9, blocker 3).
//
// The prior P9 attempt wrote `brief_md` and never `agenda`. This card renders
// `agenda` sections only; `brief_md` appears in the type and nowhere in the JSX.
// So a weekly row produced a card with an empty body and nobody noticed, because
// no test asserted on the render path. These tests close that gap from both sides.

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingCard, type BoardMeeting } from '../MeetingCard'

const WEEKLY_SECTION = {
  title: 'Weekly review',
  highlight: 'Velocity 62/100 — Steady progress across the portfolio',
  items: ['Week ending 2026-08-07 — 12 issues shipped', 'Next: Clear 3 overdue items'],
}

function meeting(over: Partial<BoardMeeting> = {}): BoardMeeting {
  return {
    id: 'meeting-1',
    meeting_date: '2026-08-07',
    status: 'reviewing', // avoids the 'new' → 'reviewing' PATCH on open
    agenda: {},
    brief_md: '',
    metrics: {},
    created_at: '2026-08-07T01:50:00Z',
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ notes: [] }) }))
})

describe('MeetingCard — weekly review visibility', () => {
  it('shows the weekly section title in the collapsed preview', () => {
    render(<MeetingCard meeting={meeting({ agenda: { weekly: WEEKLY_SECTION } })} onStatusChange={vi.fn()} />)
    expect(screen.getByText(/Weekly review/)).toBeInTheDocument()
  })

  it('renders the weekly highlight and items once expanded', async () => {
    render(<MeetingCard meeting={meeting({ agenda: { weekly: WEEKLY_SECTION } })} onStatusChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Weekly review/ }))

    expect(screen.getByText(WEEKLY_SECTION.highlight)).toBeInTheDocument()
    for (const item of WEEKLY_SECTION.items) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
  })

  it('renders nothing from brief_md alone — the exact P9 defect', async () => {
    const briefOnly = meeting({ agenda: {}, brief_md: '# Weekly Review\n\nVelocity 62/100' })
    render(<MeetingCard meeting={briefOnly} onStatusChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /August/ }))

    // Proves the writer must populate `agenda`: brief_md is invisible here.
    expect(screen.queryByText(/Velocity 62\/100/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Weekly Review/)).not.toBeInTheDocument()
  })

  it('keeps the daily sections alongside the merged weekly section', async () => {
    const both = meeting({
      agenda: {
        github: { title: 'GitHub', items: ['4 commits'] },
        weekly: WEEKLY_SECTION,
        shipped: { title: 'Shipped', items: ['2 issues'] },
      },
    })
    render(<MeetingCard meeting={both} onStatusChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Weekly review/ }))

    // The merge must not cost the founder the daily content.
    for (const text of ['Weekly review', 'Shipped', 'GitHub', '4 commits', '2 issues']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })
})
