/**
 * Cost ingest engine (WS1) — the pure orchestration between adapters and the
 * DB. Given normalised {@link RawCostEvent}s it produces the exact rows to
 * persist: attributed cost_records (weight-split, in AUD), internal-cost-centre
 * rows, data-quality flags for knowingly-unowned resources, and an Unattributed
 * queue for unknown keys. NO I/O — the live fetch (adapter input) and the DB
 * write are the caller's edges, so this is fully unit-testable and can't touch
 * production. Nothing is ever silently dropped.
 */

import { attribute, INTERNAL } from './attribution';
import { round4 } from './fx';
import type { CostSourceId, RawCostEvent } from './types';

export interface IngestDeps {
  /** Convert a native-currency amount to AUD (injected FX). */
  toAud: (amount: number, currency: string) => number;
  /** Resolve a business slug to its businesses.id, or null if unknown. */
  resolveBusinessId: (slug: string) => string | null;
}

export interface CostRecordInput {
  businessId: string;
  costSourceId: CostSourceId;
  periodStart: string;
  periodEnd: string;
  amountAud: number;
  allocationNote?: string;
  externalId: string;
}

export interface InternalCostInput {
  costSourceId: CostSourceId;
  periodStart: string;
  periodEnd: string;
  amountAud: number;
  note?: string;
  externalId: string;
}

export interface FlagInput {
  entity: string;
  rule: string;
  evidence: Record<string, unknown>;
}

export interface UnattributedInput {
  event: RawCostEvent;
  reason: string;
}

export interface IngestPlan {
  /** The raw events, to persist verbatim into raw_cost_event. */
  rawEvents: RawCostEvent[];
  costRecords: CostRecordInput[];
  internalCosts: InternalCostInput[];
  flags: FlagInput[];
  unattributed: UnattributedInput[];
}

/**
 * Split an AUD total across weighted attributions with a remainder correction so
 * the parts always sum EXACTLY to the total (no cents lost/created to rounding).
 */
function splitAmount(total: number, weights: number[]): number[] {
  const parts = weights.map(w => round4(total * w));
  const drift = round4(total - parts.reduce((s, p) => s + p, 0));
  if (parts.length > 0) parts[parts.length - 1] = round4(parts[parts.length - 1] + drift);
  return parts;
}

export function planIngest(
  events: RawCostEvent[],
  deps: IngestDeps
): IngestPlan {
  const plan: IngestPlan = {
    rawEvents: events,
    costRecords: [],
    internalCosts: [],
    flags: [],
    unattributed: [],
  };

  for (const event of events) {
    const totalAud = deps.toAud(event.amount, event.currency);
    const result = attribute(event.costSourceId, event.matchKey);

    if (result.kind === 'unknown') {
      plan.unattributed.push({
        event,
        reason: `no attribution rule for ${event.costSourceId}:${event.matchKey}`,
      });
      continue;
    }

    if (result.kind === 'unowned') {
      plan.flags.push({
        entity: `${event.costSourceId}:${event.matchKey}`,
        rule: 'cost-resource-unowned',
        evidence: {
          amountAud: totalAud,
          periodStart: event.periodStart,
          note: 'known resource with no owning business (decommissioned/unmapped)',
        },
      });
      continue;
    }

    const attributions = result.attributions;
    const parts = splitAmount(
      totalAud,
      attributions.map(a => a.weight)
    );

    attributions.forEach((a, i) => {
      const amountAud = parts[i];
      if (a.businessSlug === INTERNAL) {
        plan.internalCosts.push({
          costSourceId: event.costSourceId,
          periodStart: event.periodStart,
          periodEnd: event.periodEnd,
          amountAud,
          note: a.note,
          externalId: event.externalId,
        });
        return;
      }
      const businessId = deps.resolveBusinessId(a.businessSlug);
      if (!businessId) {
        // Mapped to a business we can't resolve — surface it, don't guess.
        plan.unattributed.push({
          event,
          reason: `business slug '${a.businessSlug}' not found`,
        });
        return;
      }
      plan.costRecords.push({
        businessId,
        costSourceId: event.costSourceId,
        periodStart: event.periodStart,
        periodEnd: event.periodEnd,
        amountAud,
        allocationNote: a.note,
        externalId: event.externalId,
      });
    });
  }

  return plan;
}
