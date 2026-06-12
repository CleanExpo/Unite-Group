/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { SourceBadge } from '../SourceBadge';

describe('SourceBadge', () => {
  it('exposes mode via data-source-mode for E2E selectors', () => {
    const html = renderToStaticMarkup(
      <SourceBadge mode="live" label="CRM · 7 tasks" />,
    );
    expect(html).toContain('data-source-mode="live"');
    expect(html).toContain('CRM · 7 tasks');
  });

  it('renders all four canonical modes', () => {
    for (const mode of ['live', 'seed', 'loading', 'degraded'] as const) {
      const html = renderToStaticMarkup(<SourceBadge mode={mode} label="x" />);
      expect(html).toContain(`data-source-mode="${mode}"`);
    }
  });

  it('renders a relative timestamp only for the live mode', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    const live = renderToStaticMarkup(
      <SourceBadge mode="live" label="x" lastUpdatedAt={recent} />,
    );
    expect(live).toMatch(/ago/);

    const seed = renderToStaticMarkup(
      <SourceBadge mode="seed" label="x" lastUpdatedAt={recent} />,
    );
    expect(seed).not.toMatch(/ago/);
  });

  it('writes an aria-label that names the source and the label', () => {
    const html = renderToStaticMarkup(
      <SourceBadge mode="degraded" label="CRM unreachable" />,
    );
    expect(html).toContain('Source: degraded');
    expect(html).toContain('CRM unreachable');
  });
});
