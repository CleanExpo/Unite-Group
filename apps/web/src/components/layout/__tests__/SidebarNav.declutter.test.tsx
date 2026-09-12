import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarNav } from '../SidebarNav'
import { FOUNDER_NAV_ITEMS } from '@/lib/navigation/founder-nav'
let pathname = '/founder/command-centre'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
const groups = ['Money', 'Pipeline', 'Growth', 'Advisory', 'Knowledge', 'System']
const labels = ['Mission Control', 'Agents', 'Chat', 'PR Approvals', 'Margot campaign review', 'Bookkeeper', 'Xero', 'Invoices', 'Approvals', 'Kanban', 'My Board', 'Opportunities', 'Contacts', 'Email', 'Calendar', 'Social', 'Campaigns', 'Brand Video', 'Analytics', 'Experiments', 'Advisory', 'Strategy', 'Boardroom', 'Notes', 'Content', 'Knowledge Console', 'Wiki', 'Pi', 'Skills', 'Schedule', 'Vault', 'Settings']
describe('secondary sidebar disclosure', () => {
  it('keeps core destinations visible and secondary groups closed on home without removing search destinations', () => {
    pathname = '/founder/command-centre'
    render(<SidebarNav collapsed={false} />)
    for (const label of groups) expect(screen.getByText(label, { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
    expect(screen.getAllByRole('link').filter(link => !link.closest('details'))).toHaveLength(4)
    expect(FOUNDER_NAV_ITEMS.map(item => item.label)).toEqual(labels)
    expect(new Set(FOUNDER_NAV_ITEMS.map(item => item.href)).size).toBe(32)
  })
  it.each([
    ['/founder/bookkeeper/entry', 'Money', 'Bookkeeper'],
    ['/founder/kanban/own', 'Pipeline', 'My Board'],
    ['/founder/campaigns/example', 'Growth', 'Campaigns'],
    ['/founder/advisory/example', 'Advisory', 'Advisory'],
    ['/founder/notes/example', 'Knowledge', 'Notes'],
    ['/founder/settings/profile', 'System', 'Settings'],
  ])('opens the matching group on %s with only one active destination', (path, group, label) => {
    pathname = path
    render(<SidebarNav collapsed={false} />)
    expect(screen.getByText(group, { selector: 'summary' }).closest('details')).toHaveAttribute('open')
    const active = screen.getAllByRole('link', { hidden: true }).filter(link => link.getAttribute('aria-current'))
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent(label)
  })
  it('does not treat a similar prefix as an active destination', () => {
    pathname = '/founder/pi-other'
    render(<SidebarNav collapsed={false} />)
    expect(screen.getByText('Knowledge', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
    expect(screen.getAllByRole('link', { hidden: true }).filter(link => link.getAttribute('aria-current'))).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Pi', hidden: true }).getAttribute('class')).not.toContain('before:absolute')
  })
  it('keeps native toggles and opens a newly selected group after navigation', () => {
    pathname = '/founder/command-centre'
    const { rerender } = render(<SidebarNav collapsed={false} />)
    const growth = screen.getByText('Growth', { selector: 'summary' })
    fireEvent.click(growth)
    expect(growth.closest('details')).toHaveAttribute('open')
    fireEvent.click(growth)
    expect(growth.closest('details')).not.toHaveAttribute('open')
    pathname = '/founder/campaigns/example'
    rerender(<SidebarNav collapsed={false} />)
    expect(screen.getByText('Growth', { selector: 'summary' }).closest('details')).toHaveAttribute('open')
  })
  it('preserves every labelled destination in the collapsed rail', () => {
    pathname = '/founder/command-centre'
    render(<SidebarNav collapsed />)
    expect(screen.getAllByRole('link')).toHaveLength(32)
    for (const item of FOUNDER_NAV_ITEMS) expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
  })
})
