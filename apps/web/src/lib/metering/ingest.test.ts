import { describe, it, expect } from 'vitest';

import { toAud } from './fx';
import { planIngest, type IngestDeps } from './ingest';
import type { RawCostEvent } from './types';

const RATES = { USD: 1.5 }; // AUD per USD (test rate)

const deps: IngestDeps = {
  toAud: (amount, currency) => toAud(amount, currency, RATES),
  resolveBusinessId: slug => {
    const map: Record<string, string> = {
      synthex: 'biz-synthex',
      'disaster-recovery': 'biz-dr',
      nrpg: 'biz-nrpg',
    };
    return map[slug] ?? null;
  },
};

function ev(partial: Partial<RawCostEvent>): RawCostEvent {
  return {
    costSourceId: 'vercel',
    externalId: 'ii_1',
    matchKey: 'synthex',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    amount: 10,
    currency: 'USD',
    ...partial,
  };
}

describe('toAud', () => {
  it('converts USD → AUD and passes AUD through 1:1', () => {
    expect(toAud(10, 'USD', RATES)).toBe(15);
    expect(toAud(10, 'AUD', RATES)).toBe(10);
  });
  it('throws rather than guess when a rate is missing', () => {
    expect(() => toAud(10, 'EUR', RATES)).toThrow(/no FX rate/i);
  });
});

describe('planIngest', () => {
  it('attributes a single-owner cost to one business in AUD', () => {
    const plan = planIngest([ev({ matchKey: 'synthex', amount: 10 })], deps);
    expect(plan.costRecords).toHaveLength(1);
    expect(plan.costRecords[0]).toMatchObject({
      businessId: 'biz-synthex',
      amountAud: 15,
      costSourceId: 'vercel',
    });
    expect(plan.unattributed).toHaveLength(0);
  });

  it('splits a shared resource so parts sum EXACTLY to the AUD total', () => {
    const plan = planIngest(
      [ev({ matchKey: 'dr-nrpg-platform', amount: 33.33 })],
      deps
    );
    expect(plan.costRecords).toHaveLength(2);
    const total = plan.costRecords.reduce((s, r) => s + r.amountAud, 0);
    expect(total).toBeCloseTo(toAud(33.33, 'USD', RATES), 10);
    expect(plan.costRecords.map(r => r.businessId).sort()).toEqual([
      'biz-dr',
      'biz-nrpg',
    ]);
  });

  it('routes internal tooling to internalCosts, not a business', () => {
    const plan = planIngest([ev({ matchKey: 'pi-dev-ops', amount: 4 })], deps);
    expect(plan.costRecords).toHaveLength(0);
    expect(plan.internalCosts).toHaveLength(1);
    expect(plan.internalCosts[0].amountAud).toBe(6);
  });

  it('flags a knowingly-unowned resource (not silently absorbed)', () => {
    const plan = planIngest([ev({ matchKey: 'unite-hub', amount: 9 })], deps);
    expect(plan.flags).toHaveLength(1);
    expect(plan.flags[0].rule).toBe('cost-resource-unowned');
    expect(plan.costRecords).toHaveLength(0);
  });

  it('routes an unmapped key to the Unattributed queue', () => {
    const plan = planIngest([ev({ matchKey: 'brand-new-app' })], deps);
    expect(plan.unattributed).toHaveLength(1);
    expect(plan.unattributed[0].reason).toMatch(/no attribution rule/);
  });

  it('surfaces a mapped-but-unresolvable business instead of guessing', () => {
    // 'ato' is in the attribution map but not in this deps.resolveBusinessId.
    const plan = planIngest([ev({ matchKey: 'ato-app', amount: 5 })], deps);
    expect(plan.costRecords).toHaveLength(0);
    expect(plan.unattributed).toHaveLength(1);
    expect(plan.unattributed[0].reason).toMatch(/not found/);
  });

  it('preserves every raw event for the immutable audit', () => {
    const events = [ev({ matchKey: 'synthex' }), ev({ matchKey: 'unite-hub' })];
    const plan = planIngest(events, deps);
    expect(plan.rawEvents).toBe(events);
  });
});
