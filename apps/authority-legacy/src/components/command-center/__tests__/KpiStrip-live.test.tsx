/**
 * @jest-environment node
 *
 * Pins the SourceBadge mode flip on KpiStrip: seed by default,
 * live when arrSourceLiveAt is set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { KpiStrip } from '../KpiStrip';

describe('KpiStrip SourceBadge', () => {
  it('renders mode="seed" with no live props', () => {
    const html = renderToStaticMarkup(<KpiStrip />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).not.toContain('data-source-mode="live"');
  });

  it('renders mode="live" when arrSourceLiveAt is set', () => {
    const html = renderToStaticMarkup(
      <KpiStrip
        arrCents={120_000_00}
        arrSourceLiveAt={new Date().toISOString()}
        atRiskCount={1}
      />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).not.toContain('data-source-mode="seed"');
    expect(html).toMatch(/1 at risk/);
  });

  it('shows the live ARR value in the ARR tile delta', () => {
    const html = renderToStaticMarkup(
      <KpiStrip
        arrCents={120_000_00}
        arrSourceLiveAt={new Date().toISOString()}
        atRiskCount={0}
      />,
    );
    expect(html).toMatch(/live · portfolio total/);
  });
});
