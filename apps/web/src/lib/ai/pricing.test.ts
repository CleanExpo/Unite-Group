/**
 * Pricing is the arithmetic the whole cost ledger rests on. A wrong rate or a
 * silent zero here misstates every downstream figure, so these pin the maths
 * against hand-checkable cases and the failure modes that would understate
 * spend without erroring.
 */
import { describe, expect, it } from 'vitest';

import { MODEL_RATES, RATES_VERIFIED_ON, priceUsage, rateForModel } from './pricing';

describe('rateForModel', () => {
  it('resolves a dated model variant to its family', () => {
    // The repo pins HAIKU as 'claude-haiku-4-5-20251001'; without prefix
    // matching that snapshot would be unpriced and silently cost zero.
    expect(rateForModel('claude-haiku-4-5-20251001')).toEqual({
      inputPerMTok: 1,
      outputPerMTok: 5,
    });
  });

  it('prefers the longest matching prefix', () => {
    // 'claude-opus-4-8' and 'claude-opus-4-7' share a stem; a shortest-match
    // implementation could resolve one to the other's rate.
    expect(rateForModel('claude-opus-4-8')).toEqual(MODEL_RATES['claude-opus-4-8']);
    expect(rateForModel('claude-sonnet-4-6')).toEqual(MODEL_RATES['claude-sonnet-4-6']);
  });

  it('returns null for an unknown model rather than a zero rate', () => {
    expect(rateForModel('gpt-4o')).toBeNull();
    expect(rateForModel('claude-something-unreleased')).toBeNull();
  });

  it('does not price an unknown model that merely starts with a known family', () => {
    // Regression for a real defect found by review on PR #1009. The first
    // implementation used a bare startsWith, so these resolved to their
    // neighbouring family's rate and were recorded as PRICED — a wrong number
    // with no unpriced_model flag. Mispriced is silent; unpriced is loud, and
    // this must fail in the loud direction.
    expect(rateForModel('claude-haiku-4-5-unreleased')).toBeNull();
    expect(rateForModel('claude-opus-4-8-anything')).toBeNull();
    expect(rateForModel('claude-sonnet-5-preview')).toBeNull();
  });

  it('still accepts the dated snapshot form', () => {
    // The positive control for the guard above: over-tightening would leave
    // every real Haiku call unpriced, which is the failure the guard is
    // supposed to avoid causing.
    expect(rateForModel('claude-haiku-4-5-20251001')).not.toBeNull();
    expect(rateForModel('claude-opus-4-8-20260101')).not.toBeNull();
  });

  it('rejects a malformed date suffix', () => {
    expect(rateForModel('claude-haiku-4-5-2025')).toBeNull();      // too short
    expect(rateForModel('claude-haiku-4-5-202510011')).toBeNull(); // too long
    expect(rateForModel('claude-haiku-4-5-')).toBeNull();          // empty
  });
});

describe('priceUsage', () => {
  it('prices a known model against hand-checked arithmetic', () => {
    // 1M in @ $5 + 1M out @ $25 = $30 exactly.
    expect(priceUsage({ model: 'claude-opus-4-8', inputTokens: 1_000_000, outputTokens: 1_000_000 }))
      .toEqual({ costUsd: 30, inputPerMTok: 5, outputPerMTok: 25 });
  });

  it('prices the real strategy-daily shape', () => {
    // Opus 4.8, roughly one daily analysis: 15k in, 10k out.
    // 0.015 * 5 + 0.010 * 25 = 0.075 + 0.25 = 0.325
    const priced = priceUsage({
      model: 'claude-opus-4-8',
      inputTokens: 15_000,
      outputTokens: 10_000,
    });
    expect(priced?.costUsd).toBeCloseTo(0.325, 6);
  });

  it('does not floor a sub-cent Haiku call to zero', () => {
    // 1000 in + 500 out on Haiku is ~$0.0035. Rounding to cents would record
    // $0.00 and erase the coach traffic from the ledger entirely.
    const priced = priceUsage({
      model: 'claude-haiku-4-5-20251001',
      inputTokens: 1_000,
      outputTokens: 500,
    });
    expect(priced?.costUsd).toBeGreaterThan(0);
    expect(priced?.costUsd).toBeCloseTo(0.0035, 6);
  });

  it('returns null for an unknown model instead of pricing it at zero', () => {
    // The negative control for the whole file: a zero would be
    // indistinguishable from a free call and would understate spend silently.
    expect(priceUsage({ model: 'gpt-4o', inputTokens: 1_000, outputTokens: 1_000 })).toBeNull();
  });

  it('prices zero tokens as zero without erroring', () => {
    expect(priceUsage({ model: 'claude-sonnet-5', inputTokens: 0, outputTokens: 0 })?.costUsd).toBe(0);
  });
});

describe('rate table', () => {
  it('records the date the rates were verified', () => {
    // A rate table with no provenance is indistinguishable from a guess.
    expect(RATES_VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has no non-positive rates', () => {
    for (const [model, rate] of Object.entries(MODEL_RATES)) {
      expect(rate.inputPerMTok, `${model} input`).toBeGreaterThan(0);
      expect(rate.outputPerMTok, `${model} output`).toBeGreaterThan(0);
    }
  });
});
