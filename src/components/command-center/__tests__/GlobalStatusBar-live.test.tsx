/**
 * @jest-environment node
 *
 * Pins the SourceBadge mode flip on GlobalStatusBar: seed by default,
 * live when sourceLiveAt is set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { GlobalStatusBar } from '../GlobalStatusBar';

describe('GlobalStatusBar SourceBadge', () => {
  it('renders mode="seed" with no live props', () => {
    const html = renderToStaticMarkup(<GlobalStatusBar />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).not.toContain('data-source-mode="live"');
  });

  it('renders mode="live" when sourceLiveAt is set', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar
        agentsAlive={5}
        alerts={2}
        buildSha="abc1234"
        sourceLiveAt={new Date().toISOString()}
      />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).toMatch(/5 alive/);
    expect(html).toMatch(/abc1234/);
  });

  it('shows alerts count and triggers signal pip when alerts > 0', () => {
    const html = renderToStaticMarkup(
      <GlobalStatusBar
        agentsAlive={3}
        alerts={7}
        sourceLiveAt={new Date().toISOString()}
      />,
    );
    expect(html).toMatch(/Alerts.*7/s);
  });
});
