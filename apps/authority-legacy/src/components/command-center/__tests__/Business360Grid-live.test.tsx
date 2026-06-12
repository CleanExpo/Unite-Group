/**
 * @jest-environment node
 *
 * Pins the SourceBadge mode flip on Business360Grid: seed by default,
 * live when sourceLiveAt is set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { Business360Grid } from '../business-360/Business360Grid';

describe('Business360Grid SourceBadge', () => {
  it('renders mode="seed" with no live props', () => {
    const html = renderToStaticMarkup(<Business360Grid />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).not.toContain('data-source-mode="live"');
  });

  it('renders mode="live" when sourceLiveAt is set', () => {
    const html = renderToStaticMarkup(
      <Business360Grid sourceLiveAt={new Date().toISOString()} />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).toMatch(/health_snapshots/);
  });
});
