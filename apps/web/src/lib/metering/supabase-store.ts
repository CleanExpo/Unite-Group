/**
 * Supabase service-role implementation of {@link MeteringStore} — the real DB
 * edge behind persistPlan(). Untested in unit tests by design (it needs a live
 * DB); the persist LOGIC is tested against a fake store. All writes are
 * idempotent upserts. Dormant until the migration is applied.
 *
 * New tables aren't in the generated Database types yet, so the client is used
 * loosely-typed here (regenerate types after the migration lands).
 */

import { createServiceClient } from '@/lib/supabase/service';

import {
  rawKey,
  type MeteringStore,
} from './persist';
import type { RawCostEvent } from './types';

export function createSupabaseMeteringStore(): MeteringStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;

  return {
    async upsertRawEvents(events: RawCostEvent[]) {
      const map = new Map<string, string>();
      if (events.length === 0) return map;
      const { data, error } = await db
        .from('raw_cost_event')
        .upsert(
          events.map(e => ({
            cost_source_id: e.costSourceId,
            external_id: e.externalId,
            match_key: e.matchKey,
            period_start: e.periodStart,
            period_end: e.periodEnd,
            amount: e.amount,
            currency: e.currency,
            raw: e.raw ?? {},
          })),
          { onConflict: 'cost_source_id,external_id,period_start' }
        )
        .select('id, cost_source_id, external_id, period_start');
      if (error) throw new Error(`raw_cost_event upsert: ${error.message}`);
      for (const r of data ?? []) {
        map.set(rawKey(r.cost_source_id, r.external_id, r.period_start), r.id);
      }
      return map;
    },

    async upsertCostRecords(rows) {
      if (rows.length === 0) return;
      const { error } = await db.from('cost_record').upsert(
        rows.map(r => ({
          business_id: r.businessId,
          cost_source_id: r.costSourceId,
          raw_cost_event_id: r.rawCostEventId,
          period_start: r.periodStart,
          period_end: r.periodEnd,
          amount_aud: r.amountAud,
          allocation_note: r.allocationNote ?? null,
        })),
        { onConflict: 'raw_cost_event_id,business_id' }
      );
      if (error) throw new Error(`cost_record upsert: ${error.message}`);
    },

    async insertFlags(rows) {
      if (rows.length === 0) return;
      const { error } = await db
        .from('data_quality_flag')
        .insert(
          rows.map(r => ({ entity: r.entity, rule: r.rule, evidence: r.evidence }))
        );
      if (error) throw new Error(`data_quality_flag insert: ${error.message}`);
    },

    async insertUnattributed(rows) {
      if (rows.length === 0) return;
      const { error } = await db
        .from('unattributed_cost')
        .insert(
          rows.map(r => ({ raw_cost_event_id: r.rawCostEventId, reason: r.reason }))
        );
      if (error) throw new Error(`unattributed_cost insert: ${error.message}`);
    },
  };
}

/** Load the business slug → id map so ingest can resolve attributions. */
export async function loadBusinessSlugToId(): Promise<
  (slug: string) => string | null
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;
  const { data, error } = await db.from('businesses').select('id, slug');
  if (error) throw new Error(`businesses load: ${error.message}`);
  const map = new Map<string, string>();
  for (const b of data ?? []) map.set(b.slug, b.id);
  return (slug: string) => map.get(slug) ?? null;
}
