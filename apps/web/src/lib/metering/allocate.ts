/**
 * Total-cost allocation (WS1). For sources that DON'T expose per-resource cost —
 * notably Vercel, whose API bills at the team level with no per-project dollar
 * read (verified against Vercel docs 2026-07-14) — we take the real monthly
 * total (founder-supplied from the invoice) and split it across businesses by
 * their share of the source's mapped resources. Real dollars, allocated (not
 * fabricated per-project line items). Pure + exact-sum.
 */

import { ATTRIBUTION_MAP, INTERNAL } from './attribution';
import { round4 } from './fx';
import type { CostSourceId } from './types';

export interface AllocatedCost {
  /** Business slug, or the INTERNAL marker for tooling cost centres. */
  businessSlug: string;
  amountAud: number;
}

/**
 * Each owner's weight for a source = the sum of its attribution weights across
 * that source's mapped resources. Internal tooling is included (it consumes real
 * resources, so it bears its share of the total); knowingly-unowned resources
 * (`[]`) contribute nothing.
 */
export function businessWeights(sourceId: CostSourceId): Record<string, number> {
  const map = ATTRIBUTION_MAP[sourceId] ?? {};
  const weights: Record<string, number> = {};
  for (const attrs of Object.values(map)) {
    for (const a of attrs) {
      weights[a.businessSlug] = (weights[a.businessSlug] ?? 0) + a.weight;
    }
  }
  return weights;
}

/**
 * Split a total across weighted owners so the parts sum EXACTLY to the total
 * (remainder correction on the last part). Returns [] if there is no weight.
 */
export function allocateTotal(
  totalAud: number,
  weights: Record<string, number>
): AllocatedCost[] {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  if (sum <= 0) return [];
  const parts = entries.map(([businessSlug, w]) => ({
    businessSlug,
    amountAud: round4((totalAud * w) / sum),
  }));
  const drift = round4(totalAud - parts.reduce((s, p) => s + p.amountAud, 0));
  const last = parts[parts.length - 1];
  if (last) last.amountAud = round4(last.amountAud + drift);
  return parts;
}

/** Allocate a source's monthly total across its businesses (INTERNAL kept separate). */
export function allocateSourceTotal(
  sourceId: CostSourceId,
  totalAud: number
): { costs: AllocatedCost[]; internal: AllocatedCost | null } {
  const all = allocateTotal(totalAud, businessWeights(sourceId));
  const internal = all.find(c => c.businessSlug === INTERNAL) ?? null;
  const costs = all.filter(c => c.businessSlug !== INTERNAL);
  return { costs, internal };
}
