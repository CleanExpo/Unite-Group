import { describe, it, expect } from 'vitest';

import { ATTRIBUTION_MAP, attribute, INTERNAL } from './attribution';
import { vercelAdapter, type VercelUsageLine } from './adapters/vercel';
import {
  digitalOceanAdapter,
  type DigitalOceanUsageLine,
} from './adapters/digitalocean';

describe('cost attribution', () => {
  it('maps a single-owner project to that business at 100%', () => {
    const r = attribute('vercel', 'synthex');
    expect(r).toEqual({
      kind: 'attributed',
      attributions: [{ businessSlug: 'synthex', weight: 1 }],
    });
  });

  it('splits a shared resource across businesses (weights sum to 1)', () => {
    const r = attribute('vercel', 'dr-nrpg-platform');
    expect(r.kind).toBe('attributed');
    if (r.kind !== 'attributed') return;
    const slugs = r.attributions.map(a => a.businessSlug).sort();
    expect(slugs).toEqual(['disaster-recovery', 'nrpg']);
    const total = r.attributions.reduce((s, a) => s + a.weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('flags a knowingly-unowned resource as unowned (not silently absorbed)', () => {
    expect(attribute('vercel', 'unite-hub').kind).toBe('unowned');
    expect(attribute('vercel', 'cruise-ship-discount-finder').kind).toBe(
      'unowned'
    );
  });

  it('routes an unmapped key to unknown (→ Unattributed queue)', () => {
    expect(attribute('vercel', 'some-new-project').kind).toBe('unknown');
    // DigitalOcean map is not seeded yet → unknown, not a wrong guess.
    expect(attribute('digitalocean', 'carsi-do-app').kind).toBe('unknown');
  });

  it('marks internal tooling as a cost centre, not a client', () => {
    const r = attribute('vercel', 'pi-dev-ops');
    expect(r.kind).toBe('attributed');
    if (r.kind !== 'attributed') return;
    expect(r.attributions[0].businessSlug).toBe(INTERNAL);
  });

  it('invariant: every shared (multi-owner) key has weights summing to 1', () => {
    for (const [source, map] of Object.entries(ATTRIBUTION_MAP)) {
      for (const [key, attrs] of Object.entries(map ?? {})) {
        if (attrs.length > 1) {
          const total = attrs.reduce((s, a) => s + a.weight, 0);
          expect(total, `${source}/${key} weights`).toBeCloseTo(1, 10);
        }
      }
    }
  });
});

describe('hosting adapters (provider-agnostic)', () => {
  it('vercel: transforms a usage line to a normalised event keyed by project', () => {
    const line: VercelUsageLine = {
      projectName: 'restoreassist',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      amountUsd: 42.5,
      invoiceItemId: 'ii_abc',
    };
    const [e] = vercelAdapter.toEvents([line]);
    expect(e).toMatchObject({
      costSourceId: 'vercel',
      externalId: 'ii_abc',
      amount: 42.5,
      currency: 'USD',
      matchKey: 'restoreassist',
    });
  });

  it('digitalocean: transforms a billing line keyed by app name', () => {
    const line: DigitalOceanUsageLine = {
      appName: 'carsi-web',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      amountUsd: 18,
      invoiceItemId: 'do_1',
    };
    const [e] = digitalOceanAdapter.toEvents([line]);
    expect(e).toMatchObject({
      costSourceId: 'digitalocean',
      matchKey: 'carsi-web',
      amount: 18,
      currency: 'USD',
    });
    expect(digitalOceanAdapter.reachability).toBe('key-gate');
  });
});
