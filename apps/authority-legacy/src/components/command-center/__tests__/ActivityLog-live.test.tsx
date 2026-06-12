/**
 * @jest-environment node
 *
 * Pins the SourceBadge mode flip on ActivityLog: seed by default,
 * live when sourceLiveAt is set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ActivityLog } from '../activity/ActivityLog';

describe('ActivityLog SourceBadge', () => {
  it('renders mode="seed" with no live props', () => {
    const html = renderToStaticMarkup(<ActivityLog />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).not.toContain('data-source-mode="live"');
  });

  it('renders mode="live" when sourceLiveAt is set', () => {
    const html = renderToStaticMarkup(
      <ActivityLog
        events={[
          { id: 'a1', ts: new Date().toISOString(), agent: 'MARGOT', verb: 'dispatched', target: 'audit batch', severity: 'running' },
        ]}
        sourceLiveAt={new Date().toISOString()}
      />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).toMatch(/MARGOT/);
  });
});
