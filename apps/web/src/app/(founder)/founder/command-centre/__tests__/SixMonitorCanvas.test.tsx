import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SixMonitorCanvas } from '../SixMonitorCanvas'

vi.mock('../MissionStatusBand', () => ({
  MissionStatusBand: () => <div data-testid="mission-status-band">verified fleet state</div>,
}))

describe('SixMonitorCanvas', () => {
  const props = {
    actionQueue: { total_rows: 3, shown_rows: 3, read_error: null },
    blockedLanes: { total_lanes: 5, blocked_count: 1, read_error: null },
    toolCount: 12,
  }

  it('opens the existing command palette through its explicit event', () => {
    const openPalette = vi.fn()
    window.addEventListener('command-centre:open-palette', openPalette)
    render(<SixMonitorCanvas {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(openPalette).toHaveBeenCalledOnce()
    window.removeEventListener('command-centre:open-palette', openPalette)
  })

  it('labels only routes that the current decks provide', () => {
    render(<SixMonitorCanvas {...props} />)

    expect(screen.getByRole('link', { name: 'Agents & approvals' })).toHaveAttribute('href', '/founder/command-centre/operations')
    expect(screen.getByRole('link', { name: 'Delivery & proof' })).toHaveAttribute('href', '/founder/command-centre/operations')
    expect(screen.getByRole('link', { name: 'Provider accounts' })).toHaveAttribute('href', '/founder/command-centre/providers')
    expect(screen.queryByRole('link', { name: 'Command Chat' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Media' })).not.toBeInTheDocument()
  })
})
