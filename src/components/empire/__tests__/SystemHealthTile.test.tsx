// SystemHealthTile rendering tests.
//
// No jsdom / testing-library configured — we render to static markup with
// react-dom/server and assert on the resulting HTML string. This validates the
// structural contract (overall pill colour matches worst signal, every signal
// gets a dot, integration sources show through) without needing a DOM.

/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { SystemHealthTile, SourceRow, statusColor, type SystemHealth } from '../SystemHealthTile';

function fixture(overrides: Partial<SystemHealth> = {}): SystemHealth {
  return {
    overall: 'ok',
    computed_at: new Date().toISOString(),
    signals: {
      database: { status: 'ok', latency_ms: 42, summary: 'Supabase 42ms' },
      api: { status: 'ok', routes_total: 6, routes_failing: 0, summary: 'All 6 routes healthy' },
      integrations: {
        status: 'ok',
        github: 'ok',
        linear: 'ok',
        vercel: 'ok',
        railway: 'ok',
        supabase: 'ok',
        summary: '5/5 source adapters healthy',
      },
      businesses: { status: 'ok', total: 6, ok_count: 6, warn_count: 0, err_count: 0, summary: '6 brands · 6 ok · 0 warn · 0 err' },
      pi_ceo_scanner: { status: 'ok', last_scan: new Date().toISOString(), stale_brands: 0, summary: 'latest 2m ago · all fresh' },
      deploys: { status: 'ok', last_prod_deploy: new Date().toISOString(), state: 'READY', summary: 'READY · 2026-05-13' },
    },
    ...overrides,
  };
}

describe('SystemHealthTile rendering', () => {
  it('renders the all-green state with green overall pill', () => {
    const html = renderToStaticMarkup(<SystemHealthTile initialData={fixture()} />);
    expect(html).toContain('ALL GREEN');
    expect(html).toContain('Supabase 42ms');
    expect(html).toContain('All 6 routes healthy');
    expect(html).toContain('5/5 source adapters healthy');
    expect(html).toContain('data-overall="ok"');
    expect(html).toContain(statusColor('ok'));
  });

  it('renders DEGRADED label when overall is warn', () => {
    const data = fixture({ overall: 'warn' });
    data.signals.pi_ceo_scanner.status = 'warn';
    data.signals.pi_ceo_scanner.summary = 'latest 36h ago · 0 brands stale';
    const html = renderToStaticMarkup(<SystemHealthTile initialData={data} />);
    expect(html).toContain('DEGRADED');
    expect(html).toContain('data-overall="warn"');
    expect(html).toContain('latest 36h ago');
  });

  it('renders FAILING label and red pill when overall is err', () => {
    const data = fixture({ overall: 'err' });
    data.signals.deploys.status = 'err';
    data.signals.deploys.state = 'ERROR';
    data.signals.deploys.summary = 'ERROR · 2026-05-13';
    const html = renderToStaticMarkup(<SystemHealthTile initialData={data} />);
    expect(html).toContain('FAILING');
    expect(html).toContain('data-overall="err"');
    expect(html).toContain('ERROR');
  });

  it('renders all six sub-tile signals', () => {
    const html = renderToStaticMarkup(<SystemHealthTile initialData={fixture()} />);
    expect(html).toContain('data-signal="database"');
    expect(html).toContain('data-signal="api"');
    expect(html).toContain('data-signal="integrations"');
    expect(html).toContain('data-signal="businesses"');
    expect(html).toContain('data-signal="pi-ceo scanner"');
    expect(html).toContain('data-signal="deploys"');
  });

  it('matches sub-tile data-status to each signal status', () => {
    const data = fixture({ overall: 'err' });
    data.signals.database.status = 'err';
    data.signals.businesses.status = 'warn';
    const html = renderToStaticMarkup(<SystemHealthTile initialData={data} />);
    // data-signal="database" carries data-status="err"
    expect(html).toMatch(/data-signal="database"[^>]*data-status="err"/);
    expect(html).toMatch(/data-signal="businesses"[^>]*data-status="warn"/);
  });

  it('shows a loading state when no initial data', () => {
    const html = renderToStaticMarkup(<SystemHealthTile initialData={null} />);
    expect(html).toContain('Loading system health');
    // Overall pill defaults to "warn" during initial-load (degraded shimmer)
    expect(html).toContain('data-overall="warn"');
  });
});

describe('statusColor', () => {
  it('maps every status to a CSS var', () => {
    expect(statusColor('ok')).toContain('green');
    expect(statusColor('warn')).toContain('orange');
    expect(statusColor('err')).toContain('red');
    expect(statusColor('unknown')).toContain('disabled');
  });

  it('unknown is the disabled (grey) token — NOT red', () => {
    const grey = statusColor('unknown');
    expect(grey).not.toContain('red');
    expect(grey).not.toContain('orange');
    expect(grey).toContain('disabled');
  });
});

describe('SourceRow unknown rendering', () => {
  it('renders unknown as a grey dot and a dash, not as red/err', () => {
    const html = renderToStaticMarkup(<SourceRow label="railway" status="unknown" />);
    expect(html).toMatch(/data-source="railway"[^>]*data-status="unknown"/);
    // Grey token present, red/orange absent.
    expect(html).toContain(statusColor('unknown'));
    expect(html).not.toContain('var(--red-400)');
    expect(html).not.toContain('var(--orange-400)');
    // Literal "unknown" text is hidden — replaced by an em-dash.
    const visible = html.replace(/data-[a-z-]+="[^"]*"/g, '');
    expect(visible).not.toMatch(/>unknown</);
    expect(visible).toContain('—');
  });

  it('renders err source row with the red token, ok with green', () => {
    const errHtml = renderToStaticMarkup(<SourceRow label="supabase" status="err" />);
    expect(errHtml).toContain('var(--red-400)');
    expect(errHtml).toContain('>err<');

    const okHtml = renderToStaticMarkup(<SourceRow label="github" status="ok" />);
    expect(okHtml).toContain('var(--green-400)');
    expect(okHtml).toContain('>ok<');
  });
});

describe('SystemHealthTile integrations summary copy', () => {
  it('renders the new adapter-health summary verbatim from the route', () => {
    // Post-fix: integrations measures ADAPTER health only. The route emits
    // "<n>/5 source adapters healthy" on the happy path, or
    // "<n>/5 — <kinds> adapter(s) down" when one or more routes 5xx.
    const data = fixture();
    data.signals.integrations.summary = '4/5 — vercel adapter down';
    data.signals.integrations.vercel = 'err';
    data.signals.integrations.status = 'err';
    const html = renderToStaticMarkup(<SystemHealthTile initialData={data} />);
    expect(html).toContain('4/5 — vercel adapter down');
  });
});
