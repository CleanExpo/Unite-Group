/**
 * TopBar primitive tests — UNI-2060 Phase 2 (deferred)
 */

import { renderToString } from 'react-dom/server';
import { TopBar } from '@/components/founder/ui/TopBar';

describe('TopBar', () => {
  it('renders title and breadcrumb', () => {
    const html = renderToString(
      <TopBar title="Command Center" breadcrumb={['Unite-Group', 'Operations']} />,
    );
    expect(html).toContain('Command Center');
    expect(html).toContain('Unite-Group');
    expect(html).toContain('Operations');
  });

  it('shows full breadcrumb joined by separators', () => {
    const html = renderToString(
      <TopBar title="Deals" breadcrumb={['Empire', 'Growth']} />,
    );
    expect(html).toContain('Empire');
    expect(html).toContain('Growth');
  });
});
