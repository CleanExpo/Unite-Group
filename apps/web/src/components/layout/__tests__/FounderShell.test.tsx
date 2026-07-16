// src/components/layout/__tests__/FounderShell.test.tsx
//
// UNI-2397/UNI-2398 — the ⌘K guard scope. The command-centre HOME page mounts
// its own CommandPalette, so the shell yields ⌘K there and ONLY there. The
// UNI-2397 fix used startsWith and killed ⌘K on the eight sub-decks (which
// mount no palette of their own); the guard must exact-match the home route.

import { render, fireEvent } from '@testing-library/react'
import { FounderShell } from '../FounderShell'

let mockPathname = '/founder/dashboard'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// FounderShell lazy-loads IdeaCapture/CommandBar via next/dynamic — render nothing.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => null }))
vi.mock('@/components/layout/Topbar', () => ({ Topbar: () => null }))

const mockToggleSidebar = vi.fn()
const mockToggleCommandBar = vi.fn()
const mockToggleCapture = vi.fn()

vi.mock('@/store/ui', () => ({
  useUIStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      sidebarOpen: false,
      toggleSidebar: mockToggleSidebar,
      toggleCommandBar: mockToggleCommandBar,
      toggleCapture: mockToggleCapture,
    }
    return selector ? selector(state) : state
  },
}))

const user = { name: 'Phill', email: 'founder@example.test' }

function pressCommandK() {
  fireEvent.keyDown(window, { key: 'k', metaKey: true })
}

function renderShellAt(pathname: string) {
  mockPathname = pathname
  return render(
    <FounderShell user={user}>
      <div>deck</div>
    </FounderShell>,
  )
}

describe('FounderShell ⌘K guard (UNI-2397/UNI-2398)', () => {
  beforeEach(() => {
    mockToggleSidebar.mockClear()
    mockToggleCommandBar.mockClear()
    mockToggleCapture.mockClear()
  })

  it('yields ⌘K to the deck palette on the command-centre home page only', () => {
    const { unmount } = renderShellAt('/founder/command-centre')
    pressCommandK()
    expect(mockToggleCommandBar).not.toHaveBeenCalled()
    unmount()
  })

  it.each([
    '/founder/command-centre/operations',
    '/founder/command-centre/portfolio',
    '/founder/command-centre/providers',
    '/founder/command-centre/knowledge',
    '/founder/command-centre/studio',
    '/founder/command-centre/wiki-graph',
    '/founder/command-centre/operator-gateway',
    '/founder/command-centre/hermes-control-panel',
  ])('keeps the shell CommandBar on ⌘K for sub-deck %s', (pathname) => {
    const { unmount } = renderShellAt(pathname)
    pressCommandK()
    expect(mockToggleCommandBar).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('keeps the shell CommandBar on ⌘K everywhere else in the founder app', () => {
    const { unmount } = renderShellAt('/founder/dashboard')
    pressCommandK()
    expect(mockToggleCommandBar).toHaveBeenCalledTimes(1)
    unmount()
  })
})
