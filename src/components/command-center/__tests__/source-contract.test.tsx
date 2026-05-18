/**
 * @jest-environment node
 *
 * UNI-2024 contract test: every Command Center panel that ships in the
 * default Shell renders a SourceBadge so operators can always see whether
 * the values they're looking at are live, seed, loading, or degraded.
 *
 * The test exercises the *default* render — no live fetch — which means
 * every panel should fall back to mode="seed" (or "loading" for the panels
 * that fetch on mount). We assert the data-source-mode attribute is
 * present and matches the expected set.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { GlobalStatusBar } from '../GlobalStatusBar';
import { KpiStrip } from '../KpiStrip';
import { ActivityLog } from '../activity/ActivityLog';
import { Business360Grid } from '../business-360/Business360Grid';

// MissionClock relies on Date.now() inside useEffect, but server render
// is fine — useEffect is skipped on the server.

describe('Command Center source contract — every panel emits a SourceBadge', () => {
  it('GlobalStatusBar renders a seed-mode source badge', () => {
    const html = renderToStaticMarkup(<GlobalStatusBar />);
    expect(html).toMatch(/data-source-mode="seed"/);
  });

  it('KpiStrip renders a seed-mode source badge', () => {
    const html = renderToStaticMarkup(<KpiStrip />);
    expect(html).toMatch(/data-source-mode="seed"/);
  });

  it('ActivityLog renders a seed-mode source badge', () => {
    const html = renderToStaticMarkup(<ActivityLog />);
    expect(html).toMatch(/data-source-mode="seed"/);
  });

  it('Business360Grid renders a seed-mode source badge', () => {
    const html = renderToStaticMarkup(<Business360Grid />);
    expect(html).toMatch(/data-source-mode="seed"/);
  });
});
