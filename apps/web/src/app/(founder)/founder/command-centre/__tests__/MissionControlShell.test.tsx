import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MissionControlShell } from '../MissionControlShell'
import { CommandPaletteTrigger } from '../CommandPalette'
import { MISSION_CONTROL_ROUTES } from '@/lib/navigation/mission-control'
import { useUIStore } from '@/store/ui'

vi.mock('next/navigation', () => ({ usePathname: () => '/founder/command-centre' }))
vi.mock('@/components/founder/notifications/NotificationBell', () => ({ NotificationBell: () => <button>Notifications</button> }))

beforeEach(() => {
  useUIStore.setState({ deckTheme: 'deck', commandBarOpen: false, captureOpen: false, sidebarOpen: false })
})

describe('one Mission Control shell', () => {
  it.each(MISSION_CONTROL_ROUTES)('renders the actual $section body with one chrome row, theme control and active route', route => {
    render(<MissionControlShell section={route.section} title={route.label}><section>Actual {route.section} content</section></MissionControlShell>)
    expect(document.querySelectorAll('header')).toHaveLength(1)
    expect(screen.getAllByTestId('deck-feel-toggle')).toHaveLength(1)
    expect(screen.getByText(`Actual ${route.section} content`)).toBeInTheDocument()
    expect(screen.queryByLabelText('Your idea')).not.toBeInTheDocument()
    const nav = within(screen.getByRole('navigation', { name: 'Mission Control workspaces' }))
    expect(nav.getAllByRole('link')).toHaveLength(12)
    expect(nav.getByRole('link', { current: 'page' })).toHaveAttribute('href', route.href)
    expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/founder/command-centre')
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Capture idea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
  })
  it('preserves the home palette anchors and opens its palette from the shared search button', () => {
    const openPalette = vi.fn()
    window.addEventListener('command-centre:open-palette', openPalette)
    render(<MissionControlShell section="home" actions={<CommandPaletteTrigger />}><p>Founder desk</p></MissionControlShell>)
    fireEvent.click(screen.getByRole('button', { name: 'Open command palette' }))
    expect(openPalette).toHaveBeenCalledTimes(1)
    expect(useUIStore.getState().commandBarOpen).toBe(false)
    expect(document.getElementById('portfolio')).toHaveAttribute('href', '/founder/command-centre/portfolio')
    expect(document.getElementById('capability-bus')).toHaveAttribute('href', '/founder/command-centre/knowledge')
    window.removeEventListener('command-centre:open-palette', openPalette)
  })
  it('keeps search working in a home boundary without the home palette', () => {
    render(<MissionControlShell section="home" title="Mission Control unavailable"><p>Retry this page</p></MissionControlShell>)
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    expect(useUIStore.getState().commandBarOpen).toBe(true)
    expect(document.querySelector('[data-mission-home-palette="true"]')).not.toBeInTheDocument()
  })
  it('reserves the single working theme control inside the chrome rather than over page content', () => {
    render(<MissionControlShell section="operations" title="Operations"><p>Actual task queue</p></MissionControlShell>)
    const toggle = screen.getByTestId('deck-feel-toggle')
    expect(toggle.closest('header')).not.toBeNull()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(useUIStore.getState().deckTheme).toBe('daylight')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId('deck-feel-toggle')).toHaveLength(1)
  })
  it('preserves global commands and page actions on subpages without duplicating section anchors', () => {
    render(<MissionControlShell section="portfolio" title="Businesses" actions={<button>Create business</button>}><section id="portfolio">Actual portfolio</section></MissionControlShell>)
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    expect(useUIStore.getState().commandBarOpen).toBe(true)
    expect(screen.getByRole('button', { name: 'Create business' })).toBeInTheDocument()
    expect(document.querySelectorAll('#portfolio')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }))
    expect(useUIStore.getState().sidebarOpen).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Capture idea' }))
    expect(useUIStore.getState().captureOpen).toBe(true)
  })
})
