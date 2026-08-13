import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CommandPaletteTrigger } from '../CommandPalette'

describe('CommandPaletteTrigger', () => {
  it('keeps the command palette reachable without a keyboard shortcut', () => {
    const openPalette = vi.fn()
    window.addEventListener('command-centre:open-palette', openPalette)

    render(<CommandPaletteTrigger />)
    fireEvent.click(screen.getByRole('button', { name: 'Open command palette' }))

    expect(openPalette).toHaveBeenCalledOnce()
    window.removeEventListener('command-centre:open-palette', openPalette)
  })
})
