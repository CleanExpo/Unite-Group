/**
 * Sidebar primitive tests — UNI-2060 Phase 2 (deferred)
 *
 * <Sidebar> is an 80px icon rail for Command Center navigation.
 */

import { renderToString } from 'react-dom/server';
import { Sidebar } from '@/components/founder/ui/Sidebar';

describe('Sidebar', () => {
  it('renders an 80px-wide rail with nav items', () => {
    const html = renderToString(
      <Sidebar
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
          { id: 'clients', label: 'Clients', icon: 'Users' },
          { id: 'deals', label: 'Deals', icon: 'Handshake' },
        ]}
        activeId="dashboard"
      />,
    );
    expect(html).toContain('Dashboard');
    expect(html).toContain('Clients');
    expect(html).toContain('w-20');
  });

  it('marks the active item with navy background', () => {
    const html = renderToString(
      <Sidebar
        items={[
          { id: 'a', label: 'A', icon: 'X' },
          { id: 'b', label: 'B', icon: 'Y' },
        ]}
        activeId="b"
      />,
    );
    expect(html).toContain('bg-layered-navy');
  });

  it('renders each item as a link', () => {
    const html = renderToString(
      <Sidebar items={[{ id: 'home', label: 'Home', icon: 'Home', href: '/' }]} activeId="home" />,
    );
    expect(html).toContain('href="/"');
  });
});
