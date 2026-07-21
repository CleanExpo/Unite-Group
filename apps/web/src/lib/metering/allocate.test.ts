import { describe, it, expect } from 'vitest';

import {
  businessWeights,
  allocateTotal,
  allocateSourceTotal,
} from './allocate';
import { INTERNAL } from './attribution';

describe('total-cost allocation (Vercel invoice → per-business)', () => {
  it('derives owner weights from the attribution map (DR/NRPG share counts once each)', () => {
    const w = businessWeights('vercel');
    // synthex owns synthex + synthex-sandbox → weight 2
    expect(w.synthex).toBeCloseTo(2, 10);
    // dr-nrpg-platform + dr-nrpg-sandbox each split 0.5/0.5 → +1 each to DR and NRPG
    // plus disaster-recovery owns its own project (+1) → DR total 2
    expect(w['disaster-recovery']).toBeCloseTo(2, 10);
    expect(w.nrpg).toBeCloseTo(1, 10);
    expect(w[INTERNAL]).toBeGreaterThan(0); // pi-dev-ops etc.
  });

  it('splits a total so the parts sum EXACTLY to the total', () => {
    const parts = allocateTotal(100, { a: 1, b: 1, c: 1 });
    const total = parts.reduce((s, p) => s + p.amountAud, 0);
    expect(total).toBeCloseTo(100, 10);
    expect(parts).toHaveLength(3);
  });

  it('allocates proportionally to weight', () => {
    const parts = allocateTotal(90, { a: 2, b: 1 });
    const a = parts.find(p => p.businessSlug === 'a')!;
    const b = parts.find(p => p.businessSlug === 'b')!;
    expect(a.amountAud).toBeCloseTo(60, 6);
    expect(b.amountAud).toBeCloseTo(30, 6);
  });

  it('returns [] for a zero/empty weight set (no silent bad data)', () => {
    expect(allocateTotal(100, {})).toEqual([]);
    expect(allocateTotal(100, { a: 0 })).toEqual([]);
  });

  it('allocateSourceTotal separates INTERNAL from client businesses, summing to the total', () => {
    const { costs, internal } = allocateSourceTotal('vercel', 1000);
    const grand =
      costs.reduce((s, c) => s + c.amountAud, 0) + (internal?.amountAud ?? 0);
    expect(grand).toBeCloseTo(1000, 6);
    expect(costs.every(c => c.businessSlug !== INTERNAL)).toBe(true);
    expect(internal?.businessSlug).toBe(INTERNAL);
  });
});
