// src/components/layout/__tests__/Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

const testUser = { name: 'Phill McGurk', email: 'phill@example.com' }
const mockToggleCommandBar = vi.fn()
let mockPathname = '/founder/dashboard'
import { useUIStore } from '@/store/ui'

vi.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, className, style, ...rest }: any) => (
      <aside className={className} style={style}>{children}</aside>
    ),
    div: ({ children, className, style, ...rest }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/store/ui', () => ({
  useUIStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      sidebarOpen: true,
      expandedBusinesses: [],
      toggleSidebar: vi.fn(),
      toggleBusiness: vi.fn(),
      toggleCommandBar: mockToggleCommandBar,
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('Sidebar', () => {
  it('renders NEXUS wordmark', () => {
    render(<Sidebar user={testUser} />)
    expect(screen.getByText('NEXUS')).toBeInTheDocument()
  })

  it('renders all global nav items', () => {
    render(<Sidebar user={testUser} />)
    expect(screen.getByText('Mission Control')).toBeInTheDocument()
    expect(screen.getByText('Kanban')).toBeInTheDocument()
    expect(screen.getByText('Vault')).toBeInTheDocument()
    expect(screen.getByText('Knowledge Console')).toBeInTheDocument()
    expect(screen.getByText('Approvals')).toBeInTheDocument()
  })

  it('renders MY BUSINESSES section label', () => {
    render(<Sidebar user={testUser} />)
    expect(screen.getByText(/my businesses/i)).toBeInTheDocument()
  })

  it('renders business names with current labels', () => {
    render(<Sidebar user={testUser} />)
    expect(screen.getByText('Disaster Recovery')).toBeInTheDocument()
    expect(screen.getByText('SYNTHEX')).toBeInTheDocument()
    expect(screen.getByText('ATO App')).toBeInTheDocument()
    expect(screen.getByText('CCW-ERP/CRM')).toBeInTheDocument()
  })

  it('opens the correct search surface on home and other workspaces', () => {
    mockPathname = '/founder/command-centre'
    const openHome = vi.fn()
    window.addEventListener('command-centre:open-palette', openHome)
    const { unmount } = render(<><div data-mission-home-palette="true" /><Sidebar user={testUser} /></>)
    fireEvent.click(screen.getByRole('button', { name: 'Search workspaces' }))
    expect(openHome).toHaveBeenCalledTimes(1)
    expect(mockToggleCommandBar).not.toHaveBeenCalled()
    unmount()
    mockPathname = '/founder/bookkeeper'
    render(<Sidebar user={testUser} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search workspaces' }))
    expect(mockToggleCommandBar).toHaveBeenCalledTimes(1)
    window.removeEventListener('command-centre:open-palette', openHome)
  })

  it('hides text labels when sidebar is collapsed', () => {
    vi.mocked(useUIStore).mockImplementation((selector?: (s: any) => any) => {
      const state = {
        sidebarOpen: false,
        expandedBusinesses: [],
        toggleSidebar: vi.fn(),
        toggleBusiness: vi.fn(),
      }
      return selector ? selector(state) : state
    })
    render(<Sidebar user={testUser} />)
    expect(screen.queryByText('NEXUS')).not.toBeInTheDocument()
    expect(screen.queryByText('Mission Control')).not.toBeInTheDocument()
  })
})
