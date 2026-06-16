/**
 * @jest-environment node
 *
 * Pins the SourceBadge mode flip on AgentTopology: seed by default,
 * live when sourceLiveAt is set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AgentTopology } from '../topology/AgentTopology';

describe('AgentTopology SourceBadge', () => {
  it('renders mode="seed" with no live props', () => {
    const html = renderToStaticMarkup(<AgentTopology />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).not.toContain('data-source-mode="live"');
  });

  it('renders mode="live" when sourceLiveAt is set', () => {
    const html = renderToStaticMarkup(
      <AgentTopology sourceLiveAt={new Date().toISOString()} />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).toMatch(/agent_actions/);
  });
});
