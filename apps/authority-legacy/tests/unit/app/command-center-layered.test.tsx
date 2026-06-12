/**
 * Command Center Layered variant tests — UNI-2061 Phase 3
 */

import { renderToString } from 'react-dom/server';
import { LayeredCommandCenterShell } from '@/components/command-center/LayeredCommandCenterShell';

describe('LayeredCommandCenterShell', () => {
  it('renders with theme-layered CSS scope', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[]}
        integrationHealth={[]}
        liveState="live"
      />,
    );
    expect(html).toContain('theme-layered');
    expect(html).toContain('min-h-screen');
  });

  it('renders KPI tiles in a 4-column grid', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[
          { label: 'MRR', value: '$12.4k', delta: 12.5, trend: 'up' },
          { label: 'Leads', value: '42' },
          { label: 'Churn', value: '2.4%', delta: -3.2, trend: 'down' },
          { label: 'Tasks', value: '18' },
        ]}
        integrationHealth={[]}
        liveState="live"
      />,
    );
    expect(html).toContain('$12.4k');
    expect(html).toContain('+12.5%');
    expect(html).toContain('grid-cols-1');
    expect(html).toContain('lg:grid-cols-4');
  });

  it('shows LIVE indicator when liveState is live', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[]}
        integrationHealth={[]}
        liveState="live"
      />,
    );
    expect(html).toContain('LIVE');
  });

  it('shows PAUSED indicator when liveState is paused', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[]}
        integrationHealth={[]}
        liveState="paused"
      />,
    );
    expect(html).toContain('PAUSED');
  });

  it('renders integration health bars with labels', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[]}
        integrationHealth={[
          { name: 'Linear', value: 80, max: 100, status: 'ok' },
          { name: 'Vercel', value: 15, max: 100, status: 'stale' },
        ]}
        liveState="live"
      />,
    );
    expect(html).toContain('Linear');
    expect(html).toContain('Vercel');
    expect(html).toContain('health-bar');
  });

  it('renders children inside the layout', () => {
    const html = renderToString(
      <LayeredCommandCenterShell
        kpiTiles={[]}
        integrationHealth={[]}
        liveState="live"
      >
        <div data-testid="child">Nested content</div>
      </LayeredCommandCenterShell>,
    );
    expect(html).toContain('Nested content');
  });
});
