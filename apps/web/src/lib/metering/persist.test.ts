import { describe, it, expect } from 'vitest';

import { planIngest, type IngestDeps } from './ingest';
import { toAud } from './fx';
import {
  persistPlan,
  rawKey,
  type MeteringStore,
  type CostRecordRow,
  type FlagRow,
  type UnattributedRow,
} from './persist';
import type { RawCostEvent } from './types';

const deps: IngestDeps = {
  toAud: (a, c) => toAud(a, c, { USD: 1.5 }),
  resolveBusinessId: slug =>
    ({ synthex: 'biz-synthex', 'disaster-recovery': 'biz-dr', nrpg: 'biz-nrpg' }[
      slug
    ] ?? null),
};

/** A fake store that records what it was asked to write and hands back ids. */
function fakeStore() {
  const calls = {
    raw: [] as RawCostEvent[],
    costRecords: [] as CostRecordRow[],
    flags: [] as FlagRow[],
    unattributed: [] as UnattributedRow[],
  };
  const store: MeteringStore = {
    async upsertRawEvents(events) {
      calls.raw.push(...events);
      const m = new Map<string, string>();
      events.forEach((e, i) =>
        m.set(rawKey(e.costSourceId, e.externalId, e.periodStart), `raw-${i}`)
      );
      return m;
    },
    async upsertCostRecords(rows) {
      calls.costRecords.push(...rows);
    },
    async insertFlags(rows) {
      calls.flags.push(...rows);
    },
    async insertUnattributed(rows) {
      calls.unattributed.push(...rows);
    },
  };
  return { store, calls };
}

function ev(p: Partial<RawCostEvent>): RawCostEvent {
  return {
    costSourceId: 'vercel',
    externalId: 'ii_1',
    matchKey: 'synthex',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    amount: 10,
    currency: 'USD',
    ...p,
  };
}

describe('persistPlan', () => {
  it('links cost records to their raw-event ids and routes internal to null business', async () => {
    const plan = planIngest(
      [
        ev({ externalId: 'a', matchKey: 'synthex', amount: 10 }),
        ev({ externalId: 'b', matchKey: 'pi-dev-ops', amount: 4 }),
      ],
      deps
    );
    const { store, calls } = fakeStore();
    const result = await persistPlan(store, plan);

    expect(calls.raw).toHaveLength(2);
    expect(calls.costRecords).toHaveLength(2);
    const biz = calls.costRecords.find(r => r.businessId === 'biz-synthex')!;
    expect(biz.rawCostEventId).toBe('raw-0');
    expect(biz.amountAud).toBe(15);
    const internal = calls.costRecords.find(r => r.businessId === null)!;
    expect(internal.rawCostEventId).toBe('raw-1');
    expect(internal.allocationNote).toMatch(/internal/);
    expect(result).toMatchObject({ rawEvents: 2, costRecords: 2 });
  });

  it('writes flags for unowned and unattributed for unknown, linked to raw ids', async () => {
    const plan = planIngest(
      [
        ev({ externalId: 'c', matchKey: 'unite-hub', amount: 9 }),
        ev({ externalId: 'd', matchKey: 'mystery-app', amount: 3 }),
      ],
      deps
    );
    const { store, calls } = fakeStore();
    const result = await persistPlan(store, plan);

    expect(calls.flags).toHaveLength(1);
    expect(calls.flags[0].rule).toBe('cost-resource-unowned');
    expect(calls.unattributed).toHaveLength(1);
    expect(calls.unattributed[0].rawCostEventId).toBe('raw-1');
    expect(result).toMatchObject({ flags: 1, unattributed: 1 });
  });
});
