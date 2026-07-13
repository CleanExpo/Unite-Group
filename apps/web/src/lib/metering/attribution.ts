/**
 * Cost attribution — maps a source resource (a hosting project/app, a Stripe
 * account, an LLM key, …) to the business(es) that own its cost.
 *
 * - A `matchKey` that maps to one business → that business bears 100%.
 * - A shared resource (e.g. the DR/NRPG platform) splits across businesses by
 *   weight (weights for a key must sum to 1).
 * - A key mapped to `INTERNAL` is a real cost centre (tooling), metered but not
 *   billed to a client.
 * - A key mapped to `[]` is knowingly-unowned (decommissioned / to-tear-down) —
 *   surfaced as a data-quality flag, never silently absorbed.
 * - A key NOT in the map returns `unknown` → the ingest routes it to the
 *   Unattributed queue for the founder to resolve (never dropped).
 *
 * Projects/apps span providers (some Vercel, some DigitalOcean), so the map is
 * keyed by cost source. Seeded from the 2026-07-14 read-only Vercel inventory.
 */

import type { CostSourceId } from './types';

export const INTERNAL = 'INTERNAL' as const;

export interface Attribution {
  /** Business slug (matches public.businesses.slug), or the INTERNAL marker. */
  businessSlug: string;
  /** Share of the cost, (0,1]. Weights for a key sum to 1. */
  weight: number;
  note?: string;
}

/** Per-source: matchKey → attributions. `[]` = knowingly unowned. */
export type SourceAttribution = Record<string, Attribution[]>;

const one = (slug: string): Attribution[] => [{ businessSlug: slug, weight: 1 }];

export const ATTRIBUTION_MAP: Partial<Record<CostSourceId, SourceAttribution>> =
  {
    vercel: {
      synthex: one('synthex'),
      'synthex-sandbox': one('synthex'),
      restoreassist: one('restoreassist'),
      'restoreassist-sandbox': one('restoreassist'),
      'ccw-crm-web': one('ccw'),
      'ccw-crm-sandbox': one('ccw'),
      'unite-group': one('unite-group'),
      'unite-group-sandbox': one('unite-group'),
      'carsi-web': one('carsi'),
      'ato-app': one('ato'),
      'home-loan-essentials': one('home-loan-essentials'),
      'dimitri-itr-sandbox': one('itr-button'),
      'disaster-recovery': one('disaster-recovery'),
      // Shared DR/NRPG platform — split 50/50 until usage-based split lands.
      'dr-nrpg-platform': [
        { businessSlug: 'disaster-recovery', weight: 0.5, note: 'shared DR/NRPG platform' },
        { businessSlug: 'nrpg', weight: 0.5, note: 'shared DR/NRPG platform' },
      ],
      'dr-nrpg-sandbox': [
        { businessSlug: 'disaster-recovery', weight: 0.5, note: 'shared DR/NRPG sandbox' },
        { businessSlug: 'nrpg', weight: 0.5, note: 'shared DR/NRPG sandbox' },
      ],
      // Internal tooling / cost centres — metered, not billed to a client.
      'pi-dev-ops': [{ businessSlug: INTERNAL, weight: 1, note: 'internal tooling' }],
      'fabel-prompt-engineer': [{ businessSlug: INTERNAL, weight: 1, note: 'internal tooling' }],
      'plaud-processor': [{ businessSlug: INTERNAL, weight: 1, note: 'internal tooling' }],
      'live-nexus': [{ businessSlug: INTERNAL, weight: 1, note: 'internal tooling' }],
      // Knowingly unowned → data-quality flag (not silently absorbed).
      'unite-hub': [], // decommissioned 2026-06-20 — teardown candidate
      'cruise-ship-discount-finder': [], // unmapped — owner to be confirmed
    },
    // DigitalOcean apps (e.g. CARSI) — map pending a read-only DO inventory,
    // same shape as vercel above. Until seeded, unknown keys → Unattributed.
    digitalocean: {},
  };

export type AttributionResult =
  | { kind: 'attributed'; attributions: Attribution[] }
  | { kind: 'unowned' } // known key, deliberately no owner (flag it)
  | { kind: 'unknown' }; // not in the map → Unattributed queue

/** Resolve a source resource to its owning business(es). */
export function attribute(
  sourceId: CostSourceId,
  matchKey: string
): AttributionResult {
  const source = ATTRIBUTION_MAP[sourceId];
  if (!source || !(matchKey in source)) return { kind: 'unknown' };
  const attributions = source[matchKey];
  if (attributions.length === 0) return { kind: 'unowned' };
  return { kind: 'attributed', attributions };
}
