import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { IAQ_BOARD_INVITEES } from '@/lib/portal/board/invitees'

import { BoardInvitees } from '../board-invitees'

afterEach(() => cleanup())

describe('BoardInvitees', () => {
  it('lists the five IAQ board members, each marked "Email needed", with no address and no send button', () => {
    render(<BoardInvitees invitees={IAQ_BOARD_INVITEES} />)
    const table = screen.getByRole('table', { name: /IAQ Magazine board/i })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      'Shelby Berg',
      'Ivi Simms',
      'Phill McGurk',
      'Muthukumar Maragathamayil',
      'Philipp Schluter',
    ])
    for (const r of rows) expect(within(r).getByText('Email needed')).toBeTruthy()
    expect(table.textContent).not.toMatch(/@/)
    expect(screen.queryByRole('button', { name: /send/i })).toBeNull()
    expect(screen.getByText(/iaq-magazine/)).toBeTruthy()
  })
})
