/**
 * Vercel cost adapter. Pure transform from a read-only Vercel usage/billing
 * fetch into normalised {@link RawCostEvent}s. The live fetch (Vercel billing
 * API, via the connected token) produces `VercelUsageLine[]` and is injected by
 * the ingest job — this module has no I/O so it stays unit-testable.
 */

import type { CostSourceAdapter, RawCostEvent } from '../types';

/** One normalised Vercel usage line (project-scoped billing item). */
export interface VercelUsageLine {
  /** Vercel project name — the attribution matchKey. */
  projectName: string;
  periodStart: string;
  periodEnd: string;
  /** Vercel bills in USD. */
  amountUsd: number;
  /** Stable invoice-item id for dedupe. */
  invoiceItemId: string;
}

export const vercelAdapter: CostSourceAdapter<VercelUsageLine[]> = {
  id: 'vercel',
  reachability: 'token',
  nativeCurrency: 'USD',
  toEvents(lines) {
    return lines.map(
      (l): RawCostEvent => ({
        costSourceId: 'vercel',
        externalId: l.invoiceItemId,
        periodStart: l.periodStart,
        periodEnd: l.periodEnd,
        amount: l.amountUsd,
        currency: 'USD',
        matchKey: l.projectName,
        raw: { ...l },
      })
    );
  },
};
