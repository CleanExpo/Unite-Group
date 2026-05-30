/**
 * Drawer primitive tests — UNI-2060 Phase 2 (deferred)
 *
 * <Drawer> is a slide-out panel for detail views.
 */

import { renderToString } from 'react-dom/server';
import { Drawer } from '@/components/founder/ui/Drawer';

describe('Drawer', () => {
  it('renders with open state and title', () => {
    const html = renderToString(
      <Drawer open title="Lead Details">
        <p>Content</p>
      </Drawer>,
    );
    expect(html).toContain('Lead Details');
    expect(html).toContain('translate-x-0');
  });

  it('renders closed state hidden off-screen', () => {
    const html = renderToString(
      <Drawer open={false} title="Hidden">
        <p>Content</p>
      </Drawer>,
    );
    expect(html).toContain('translate-x-full');
  });

  it('renders children inside the panel', () => {
    const html = renderToString(
      <Drawer open title="Panel">
        <div data-testid="child">Nested</div>
      </Drawer>,
    );
    expect(html).toContain('Nested');
  });
});
