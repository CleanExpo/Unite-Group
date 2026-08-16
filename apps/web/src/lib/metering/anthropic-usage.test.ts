/**
 * Anthropic metering — aggregation and adapter transform.
 *
 * The aggregation is where measured calls become ledger lines, so the cases
 * below pin the grouping, the unpriced-call flag that stops a short amount
 * looking complete, and the stable externalId that makes re-ingestion an upsert
 * rather than a duplicate.
 */
import { describe, expect, it } from 'vitest';

import { anthropicAdapter, type AnthropicUsageLine } from './adapters/anthropic';
import { aggregateUsageRows } from './fetchers/anthropic';

const period = { start: '2026-08-01', end: '2026-08-31' };

const row = (over: Partial<Parameters<typeof aggregateUsageRows>[0][number]> = {}) => ({
  task_type: 'strategy-daily',
  model_id: 'claude-opus-4-8',
  tokens_input: 1_000,
  tokens_output: 500,
  cost_usd: 0.0175,
  cost_per_input_mtok: 5,
  ...over,
});

describe('aggregateUsageRows', () => {
  it('groups by capability and model', () => {
    const lines = aggregateUsageRows(
      [
        row(),
        row(),
        row({ task_type: 'coach', model_id: 'claude-haiku-4-5-20251001', cost_usd: 0.002 }),
      ],
      period,
    );

    expect(lines).toHaveLength(2);
    const strategy = lines.find(l => l.taskType === 'strategy-daily')!;
    expect(strategy.calls).toBe(2);
    expect(strategy.inputTokens).toBe(2_000);
    expect(strategy.outputTokens).toBe(1_000);
    expect(strategy.amountUsd).toBeCloseTo(0.035, 6);
  });

  it('splits the same capability across different models', () => {
    // A capability that changed model mid-period must not have its costs
    // merged — the whole point is being able to compare model choices.
    const lines = aggregateUsageRows(
      [row(), row({ model_id: 'claude-sonnet-5', cost_usd: 0.0105 })],
      period,
    );
    expect(lines).toHaveLength(2);
    expect(lines.map(l => l.model).sort()).toEqual(['claude-opus-4-8', 'claude-sonnet-5']);
  });

  it('counts unpriced calls so a short amount does not look complete', () => {
    // cost_per_input_mtok null = the recorder could not price that model.
    // Tokens still count; the amount understates spend and must say so.
    const lines = aggregateUsageRows(
      [row(), row({ cost_usd: 0, cost_per_input_mtok: null })],
      period,
    );
    expect(lines[0].calls).toBe(2);
    expect(lines[0].unpricedCalls).toBe(1);
    expect(lines[0].inputTokens).toBe(2_000); // tokens survive
  });

  it('keeps null task_type as an explicit unattributed line rather than dropping it', () => {
    const lines = aggregateUsageRows([row({ task_type: null })], period);
    expect(lines).toHaveLength(1);
    expect(lines[0].taskType).toBe('unattributed');
  });

  it('tolerates null token and cost columns', () => {
    const lines = aggregateUsageRows(
      [row({ tokens_input: null, tokens_output: null, cost_usd: null })],
      period,
    );
    expect(lines[0].inputTokens).toBe(0);
    expect(lines[0].amountUsd).toBe(0);
  });

  it('returns nothing for no rows', () => {
    expect(aggregateUsageRows([], period)).toEqual([]);
  });

  it('does not accumulate floating-point drift across many rows', () => {
    // 10,000 calls at 6dp each: naive summation drifts into the 1e-10s and
    // makes the ledger amount non-reproducible between runs.
    const lines = aggregateUsageRows(Array.from({ length: 10_000 }, () => row({ cost_usd: 0.000001 })), period);
    expect(lines[0].amountUsd).toBe(0.01);
  });
});

describe('anthropicAdapter', () => {
  const line: AnthropicUsageLine = {
    taskType: 'strategy-daily',
    model: 'claude-opus-4-8',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    inputTokens: 2_000,
    outputTokens: 1_000,
    calls: 2,
    amountUsd: 0.035,
    unpricedCalls: 0,
  };

  it('maps a usage line onto the RawCostEvent contract', () => {
    const [event] = anthropicAdapter.toEvents([line]);
    expect(event.costSourceId).toBe('anthropic');
    expect(event.currency).toBe('USD');
    expect(event.amount).toBe(0.035);
    // matchKey is what attribution.ts maps to a business.
    expect(event.matchKey).toBe('strategy-daily');
  });

  it('produces a stable externalId so re-ingesting upserts', () => {
    // persist dedupes on cost_source_id + external_id + period_start; a
    // time-varying id would duplicate the whole period on every cron run.
    const first = anthropicAdapter.toEvents([line])[0].externalId;
    const second = anthropicAdapter.toEvents([line])[0].externalId;
    expect(first).toBe(second);
    expect(first).toBe('2026-08-01:strategy-daily:claude-opus-4-8');
  });

  it('distinguishes capabilities and models within a period', () => {
    const events = anthropicAdapter.toEvents([
      line,
      { ...line, model: 'claude-sonnet-5' },
      { ...line, taskType: 'coach' },
    ]);
    expect(new Set(events.map(e => e.externalId)).size).toBe(3);
  });

  it('carries the unpriced-call count into the raw payload', () => {
    const [event] = anthropicAdapter.toEvents([{ ...line, unpricedCalls: 3 }]);
    expect(event.raw?.unpricedCalls).toBe(3);
    expect(event.raw?.measurement).toBe('first-party-tokens');
  });

  it('declares the source metadata the registry relies on', () => {
    expect(anthropicAdapter.id).toBe('anthropic');
    expect(anthropicAdapter.nativeCurrency).toBe('USD');
  });
});
