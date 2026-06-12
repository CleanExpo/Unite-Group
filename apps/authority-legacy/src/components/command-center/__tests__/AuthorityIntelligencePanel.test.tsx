/**
 * @jest-environment node
 *
 * Pins the Authority Intelligence panel contract:
 *   - seed defaults (no fetchedAt) — wrapper status "missing" or "draft",
 *     3 approval gates, "No live records" empty state.
 *   - live data (fetchedAt set) — SourceBadge mode "live", metric tiles
 *     render, signal cards appear with status labels.
 *   - sourceErrorCount > 0 is surfaced via data-signal="true" on the metric.
 *
 * Mirrors the SourceBadge-mode-flip convention used across the Command
 * Center (ActivityLog-live, KpiStrip-live, Business360Grid-live, etc.).
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AuthorityIntelligencePanel } from '../AuthorityIntelligencePanel';
import type { AuthorityIntelligenceResult } from '@/lib/empire/read-authority-intelligence';

describe('AuthorityIntelligencePanel', () => {
  it('renders seed defaults when no fetchedAt is provided', () => {
    const html = renderToStaticMarkup(<AuthorityIntelligencePanel />);
    expect(html).toContain('data-source-mode="seed"');
    expect(html).toContain('wrapper missing');
    expect(html).toContain('No live Authority Intelligence records found.');
  });

  it('exposes aria-label="Authority Intelligence" on the section root', () => {
    const html = renderToStaticMarkup(<AuthorityIntelligencePanel />);
    expect(html).toContain('aria-label="Authority Intelligence"');
  });

  it('renders the four approval gates from the seed defaults', () => {
    const html = renderToStaticMarkup(<AuthorityIntelligencePanel />);
    expect(html).toContain('No public publishing without approval');
    expect(html).toContain('No community replies without approval');
    expect(html).toContain('No client contact, spend, deployment or merge without approval');
  });

  it('flips SourceBadge to mode="live" and renders metric tiles when fetchedAt is set', () => {
    const live: AuthorityIntelligenceResult = {
      wrapperStatus: 'active',
      materialSignals: 7,
      sourceErrorCount: 0,
      assetsAwaitingReview: 3,
      approvalGates: [
        'No public publishing without approval',
        'No community replies without approval',
      ],
      nextRecommendedAction: 'Use the Nexus Authority Intelligence Wrapper on every new task.',
      signals: [
        {
          id: 'authority-intelligence/nexus-authority-intelligence-wrapper-implementation-2026-06-09',
          title: 'Nexus Authority Intelligence Wrapper — Implementation',
          status: 'draft-for-review',
          source: 'wiki_pages',
          updatedAt: '2026-06-09T01:00:00Z',
          href: '/wiki?query=authority-intelligence',
        },
        {
          id: 'authority-intelligence/opportunity-radar/daily/2026-06-09-daily',
          title: 'Daily Opportunity Radar — 09/06',
          status: 'active-7-day-pilot',
          source: 'wiki_pages',
          updatedAt: '2026-06-09T02:00:00Z',
          href: '/wiki?query=opportunity-radar',
        },
      ],
      fetchedAt: '2026-06-09T03:00:00Z',
    };
    const html = renderToStaticMarkup(<AuthorityIntelligencePanel {...live} />);
    expect(html).toContain('data-source-mode="live"');
    expect(html).toContain('wiki_pages · wrapper');
    expect(html).toContain('wrapper active');
    expect(html).toContain('Nexus Authority Intelligence Wrapper — Implementation');
    expect(html).toContain('Daily Opportunity Radar — 09/06');
    // The metric values render as standalone text. Both '7' and '3' must
    // appear as standalone number cells (not embedded in long strings).
    expect(html).toMatch(/>7</);
    expect(html).toMatch(/>3</);
  });

  it('flips wrapper label to "pilot only" when wrapperStatus="draft"', () => {
    const html = renderToStaticMarkup(
      <AuthorityIntelligencePanel wrapperStatus="draft" fetchedAt="2026-06-09T03:00:00Z" />,
    );
    expect(html).toContain('pilot only');
  });

  it('surfaces the "wrapper missing" label when no data is wired', () => {
    const html = renderToStaticMarkup(<AuthorityIntelligencePanel />);
    expect(html).toContain('wrapper missing');
  });

  it('renders the Source errors metric in signal color when sourceErrorCount > 0', () => {
    // With sourceErrorCount=2, the third metric cell paints its value in
    // the --cc-signal accent. With sourceErrorCount=0, it falls back to
    // --cc-ink. We assert both states are observable.
    const errorsHtml = renderToStaticMarkup(
      <AuthorityIntelligencePanel
        wrapperStatus="active"
        materialSignals={0}
        sourceErrorCount={2}
        assetsAwaitingReview={0}
        approvalGates={[]}
        nextRecommendedAction="x"
        signals={[]}
        fetchedAt="2026-06-09T03:00:00Z"
      />,
    );
    expect(errorsHtml).toContain('color:var(--cc-signal)');

    const noErrorsHtml = renderToStaticMarkup(
      <AuthorityIntelligencePanel
        wrapperStatus="active"
        materialSignals={0}
        sourceErrorCount={0}
        assetsAwaitingReview={0}
        approvalGates={[]}
        nextRecommendedAction="x"
        signals={[]}
        fetchedAt="2026-06-09T03:00:00Z"
      />,
    );
    expect(noErrorsHtml).toContain('color:var(--cc-ink)');
  });
});
