/**
 * Persist an {@link IngestPlan} to the metering tables. The DB specifics live
 * behind a {@link MeteringStore} interface (the real one is Supabase
 * service-role — see supabase-store.ts), so this linking logic — matching cost
 * rows to their raw-event ids, routing internal vs business rows — is unit
 * testable with a fake store and never touches a live DB in tests.
 *
 * Order matters: raw events first (they own the ids the other rows reference).
 * All writes are idempotent upserts, so a re-run of the same period is a no-op.
 */

import type { IngestPlan } from './ingest';
import type { RawCostEvent } from './types';

/** Dedupe key mirroring raw_cost_event's UNIQUE(cost_source_id, external_id, period_start). */
export function rawKey(
  costSourceId: string,
  externalId: string,
  periodStart: string
): string {
  return `${costSourceId}::${externalId}::${periodStart}`;
}

export interface CostRecordRow {
  /** null = internal cost centre (no owning business). */
  businessId: string | null;
  costSourceId: string;
  rawCostEventId: string;
  periodStart: string;
  periodEnd: string;
  amountAud: number;
  allocationNote?: string;
}

export interface FlagRow {
  entity: string;
  rule: string;
  evidence: Record<string, unknown>;
}

export interface UnattributedRow {
  rawCostEventId: string;
  reason: string;
}

/** The DB seam. Real impl = Supabase service-role; tests use a fake. */
export interface MeteringStore {
  /** Upsert raw events (idempotent); resolve each to its id keyed by {@link rawKey}. */
  upsertRawEvents(events: RawCostEvent[]): Promise<Map<string, string>>;
  upsertCostRecords(rows: CostRecordRow[]): Promise<void>;
  insertFlags(rows: FlagRow[]): Promise<void>;
  insertUnattributed(rows: UnattributedRow[]): Promise<void>;
}

export interface PersistResult {
  rawEvents: number;
  costRecords: number;
  flags: number;
  unattributed: number;
}

export async function persistPlan(
  store: MeteringStore,
  plan: IngestPlan
): Promise<PersistResult> {
  const idByKey = await store.upsertRawEvents(plan.rawEvents);

  const idFor = (e: {
    costSourceId: string;
    externalId: string;
    periodStart: string;
  }): string | undefined =>
    idByKey.get(rawKey(e.costSourceId, e.externalId, e.periodStart));

  const costRows: CostRecordRow[] = [];
  for (const c of plan.costRecords) {
    const id = idFor(c);
    if (!id) continue; // raw upsert must have produced it; skip defensively
    costRows.push({
      businessId: c.businessId,
      costSourceId: c.costSourceId,
      rawCostEventId: id,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      amountAud: c.amountAud,
      allocationNote: c.allocationNote,
    });
  }
  for (const ic of plan.internalCosts) {
    const id = idFor(ic);
    if (!id) continue;
    costRows.push({
      businessId: null,
      costSourceId: ic.costSourceId,
      rawCostEventId: id,
      periodStart: ic.periodStart,
      periodEnd: ic.periodEnd,
      amountAud: ic.amountAud,
      allocationNote: ic.note ? `internal: ${ic.note}` : 'internal',
    });
  }
  await store.upsertCostRecords(costRows);

  await store.insertFlags(plan.flags);

  const unattRows: UnattributedRow[] = [];
  for (const u of plan.unattributed) {
    const id = idFor(u.event);
    if (id) unattRows.push({ rawCostEventId: id, reason: u.reason });
  }
  await store.insertUnattributed(unattRows);

  return {
    rawEvents: plan.rawEvents.length,
    costRecords: costRows.length,
    flags: plan.flags.length,
    unattributed: unattRows.length,
  };
}
