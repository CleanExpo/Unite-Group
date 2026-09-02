// src/app/(founder)/founder/command-centre/BlockedOnMeTile.render.test.tsx
//
// Mission Control Day 1 — what the founder SEES: the oldest decision on top,
// its age in days, and a loud unavailable state when the ledger cannot be read.

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlockedOnMeTile, type BlockedOnMeData } from './BlockedOnMeTile'

const base: BlockedOnMeData = {
  source: 'FOUNDER-QUEUE.md',
  checked_at: '2026-09-03T00:00:00.000Z',
  total_rows: 2,
  rows: [
    { id: 'F2', decision: 'Click Connect Google', opened: '2026-07-06', age_days: 59, blocks: 'UNI-2329', context: '', status: 'open' },
    { id: 'F1', decision: 'Flip the identity env var', opened: '2026-08-16', age_days: 18, blocks: 'identity cutover', context: '', status: 'open' },
  ],
  oldest_id: 'F2',
  unaged: [],
  read_error: null,
}

describe('BlockedOnMeTile render', () => {
  it('shows the oldest decision first with its age, and the checked-at stamp', () => {
    render(<BlockedOnMeTile data={base} />)
    const rows = screen.getAllByTestId('blocked-on-me-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('F2')
    expect(rows[0]).toHaveTextContent('59 days')
    expect(screen.getByTestId('blocked-on-me-summary')).toHaveTextContent('2 decisions waiting on you · oldest F2 at 59 days')
    expect(screen.getByTestId('blocked-on-me-tile')).toHaveTextContent('checked 2026-09-03T00:00:00.000Z')
  })

  it('renders an unavailable state, and NO rows, when the ledger could not be read', () => {
    render(<BlockedOnMeTile data={{ ...base, rows: [], total_rows: 0, oldest_id: null, read_error: 'ledger has 1 unreadable line(s): Line 40' }} />)
    expect(screen.getByTestId('blocked-on-me-tile-error')).toHaveTextContent('Founder queue unavailable: ledger has 1 unreadable line(s)')
    expect(screen.queryAllByTestId('blocked-on-me-row')).toHaveLength(0)
  })

  it('names rows whose date could not be aged instead of hiding them', () => {
    render(<BlockedOnMeTile data={{ ...base, unaged: ['F9: Unparseable opened date: "soon"'] }} />)
    expect(screen.getByTestId('blocked-on-me-unaged')).toHaveTextContent('F9')
  })
})
