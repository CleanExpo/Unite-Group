import { render, screen } from '@testing-library/react'
import { SidebarBusinessItem } from '../SidebarBusinessItem'
import { BUSINESSES } from '@/lib/businesses'

vi.mock('next/navigation', () => ({ usePathname: () => '/founder/dr' }))
vi.mock('@/store/ui', () => ({
  useUIStore: (selector: (state: unknown) => unknown) => selector({
    expandedBusinesses: [], toggleBusiness: vi.fn(),
  }),
}))

describe('collapsed business navigation', () => {
  it('contains each full-row link in its own row rather than the sidebar', () => {
    // jsdom does not load generated Tailwind CSS; supply its positioning rules.
    render(<><style>{'.relative { position: relative; } .absolute { position: absolute; }'}</style>
      <aside className="relative">{BUSINESSES.map(business =>
        <SidebarBusinessItem key={business.key} business={business} collapsed />
      )}</aside></>)
    const rows = new Set<Element>()
    for (const business of BUSINESSES) {
      const link = screen.getByRole('link', { name: business.name })
      expect(link).toHaveAttribute('href', `/founder/${business.key}`)
      expect(getComputedStyle(link).position).toBe('absolute')
      let block = link.parentElement
      while (block && !['relative', 'absolute', 'fixed', 'sticky'].includes(getComputedStyle(block).position)) {
        block = block.parentElement
      }
      expect(block).toBe(link.parentElement)
      expect(block?.tagName).not.toBe('ASIDE')
      rows.add(block!)
    }
    expect(rows.size).toBe(BUSINESSES.length)
  })
})
