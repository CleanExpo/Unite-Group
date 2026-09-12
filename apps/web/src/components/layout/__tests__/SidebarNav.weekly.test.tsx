import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarNav } from '../SidebarNav'
import { FOUNDER_NAV_ITEMS } from '@/lib/navigation/founder-nav'
let pathname = '/founder/command-centre'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

describe('Weekly Tasks navigation', () => {
  it('discloses the Margot child and keeps command search on the same real destination', () => {
    pathname = '/founder/command-centre'
    render(<SidebarNav collapsed={false} />)
    const disclosure = screen.getByText('Weekly Tasks').closest('details')!
    expect(disclosure.open).toBe(false)
    fireEvent.click(screen.getByText('Weekly Tasks'))
    expect(disclosure.open).toBe(true)
    const child = screen.getByRole('link', { name: 'Margot campaign review' })
    expect(child).toHaveAttribute('href', '/founder/weekly-tasks/margot')
    expect(FOUNDER_NAV_ITEMS.filter(item => item.href === '/founder/weekly-tasks/margot')).toHaveLength(1)
  })
  it('shows the active child and an accessible icon link in the collapsed sidebar', () => {
    pathname = '/founder/weekly-tasks/margot'
    const { rerender } = render(<SidebarNav collapsed={false} />)
    expect(screen.getByText('Weekly Tasks').closest('details')).toHaveAttribute('open')
    expect(screen.getByRole('link', { name: 'Margot campaign review' })).toHaveAttribute('aria-current', 'page')
    rerender(<SidebarNav collapsed />)
    expect(screen.getByRole('link', { name: 'Margot campaign review' })).toHaveAttribute('href', pathname)
  })
})
