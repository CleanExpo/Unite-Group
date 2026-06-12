/**
 * Ticker primitive tests — UNI-2060 Phase 2 (deferred)
 *
 * <Ticker> scrolls live events horizontally, marquee-style.
 */

import { renderToString } from 'react-dom/server';
import { Ticker } from '@/components/founder/ui/Ticker';

describe('Ticker', () => {
  it('renders a ticker with event items', () => {
    const html = renderToString(
      <Ticker
        events={[
          { id: '1', text: 'Linear sync OK', timestamp: '09:00' },
          { id: '2', text: 'Vercel deploy complete', timestamp: '09:15' },
          { id: '3', text: 'Supabase backup done', timestamp: '09:30' },
        ]}
      />,
    );
    expect(html).toContain('Linear sync OK');
    expect(html).toContain('Vercel deploy complete');
    expect(html).toContain('Supabase backup done');
  });

  it('shows empty state when no events', () => {
    const html = renderToString(<Ticker events={[]} />);
    expect(html).toContain('No events');
  });

  it('limits overflow to single line with marquee class', () => {
    const html = renderToString(
      <Ticker events={[{ id: '1', text: 'Event', timestamp: '09:00' }]} />,
    );
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('whitespace-nowrap');
  });
});
