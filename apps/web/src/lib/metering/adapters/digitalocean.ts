/**
 * DigitalOcean cost adapter. Some projects (e.g. CARSI) run on DigitalOcean
 * rather than Vercel, so hosting cost spans providers. Pure transform from a
 * read-only DO billing fetch into normalised {@link RawCostEvent}s; the live
 * fetch (DO billing API, via a founder-provisioned scoped token) is injected.
 */

import type { CostSourceAdapter, RawCostEvent } from '../types';

/** One normalised DigitalOcean billing line (app/resource-scoped). */
export interface DigitalOceanUsageLine {
  /** DO App Platform app / project name — the attribution matchKey. */
  appName: string;
  periodStart: string;
  periodEnd: string;
  /** DO bills in USD. */
  amountUsd: number;
  /** Stable billing-item id for dedupe. */
  invoiceItemId: string;
}

export const digitalOceanAdapter: CostSourceAdapter<DigitalOceanUsageLine[]> = {
  id: 'digitalocean',
  reachability: 'key-gate',
  nativeCurrency: 'USD',
  toEvents(lines) {
    return lines.map(
      (l): RawCostEvent => ({
        costSourceId: 'digitalocean',
        externalId: l.invoiceItemId,
        periodStart: l.periodStart,
        periodEnd: l.periodEnd,
        amount: l.amountUsd,
        currency: 'USD',
        matchKey: l.appName,
        raw: { ...l },
      })
    );
  },
};
