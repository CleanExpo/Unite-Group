/**
 * Anthropic metering — aggregation and adapter transform.
 *
 * The aggregation is where measured calls become ledger lines, so the cases
 * below pin the grouping, the unpriced-call flag that stops a short amount
 * looking complete, and the stable externalId that makes re-ingestion an upsert
 * rather than a duplicate.
 */
import { describe, expect, it, vi } from 'vitest';

import { anthropicAdapter, type AnthropicUsageLine } from './adapters/anthropic';
import { aggregateUsageRows, fetchAnthropicUsage } from './fetchers/anthropic';

const period = { start: '2026-08-01', end: '2026-08-31' };

let seq = 0;
const row = (over: Partial<Parameters<typeof aggregateUsageRows>[0][number]> = {}) => ({
  // Distinct by default: these fixtures represent SEPARATE calls, and a shared
  // id would now be deduped and silently halve every count below.
  request_id: `msg_${++seq}`,
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

  it('counts a repeated request_id only once', () => {
    // ai_usage_logs has no unique constraint on request_id, and this aggregation
    // SUMS cost_usd — so without read-side dedupe a double-recorded response
    // would inflate the ledger rather than be caught. Raised in review on #1009.
    const lines = aggregateUsageRows(
      [row({ request_id: 'msg_dup' }), row({ request_id: 'msg_dup' })],
      period,
    );
    expect(lines[0].calls).toBe(1);
    expect(lines[0].inputTokens).toBe(1_000);
    expect(lines[0].amountUsd).toBeCloseTo(0.0175, 6);
  });

  it('still counts every row when request_id is null', () => {
    // A null id means the id was unavailable at record time, NOT that the rows
    // are duplicates. Collapsing them would undercount — the opposite failure,
    // and the one this whole feature exists to prevent.
    const lines = aggregateUsageRows(
      [row({ request_id: null }), row({ request_id: null }), row({ request_id: null })],
      period,
    );
    expect(lines[0].calls).toBe(3);
    expect(lines[0].inputTokens).toBe(3_000);
  });

  it('dedupes across page boundaries, not just within a page', () => {
    // The rows arrive already concatenated from several pages, so the seen-set
    // must span the whole period rather than reset per page.
    const dup = () => row({ request_id: 'msg_same' });
    const lines = aggregateUsageRows([dup(), row(), dup(), row(), dup()], period);
    expect(lines[0].calls).toBe(3); // 1 deduped + 2 distinct
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

describe('fetchAnthropicUsage — pagination safety', () => {
  /**
   * Records the query chain so the ORDER BY can be asserted. `.range()` is the
   * terminal await; everything before it returns `this`.
   */
  function fakeDb(pages: Record<string, unknown>[][]) {
    const calls: { order: [string, { ascending: boolean }][]; ranges: [number, number][] } = {
      order: [],
      ranges: [],
    };
    let page = 0;
    const qb: Record<string, unknown> = {
      from: () => qb,
      select: () => qb,
      eq: () => qb,
      gte: () => qb,
      lt: () => qb,
      order: (col: string, opts: { ascending: boolean }) => {
        calls.order.push([col, opts]);
        return qb;
      },
      range: (a: number, b: number) => {
        calls.ranges.push([a, b]);
        return Promise.resolve({ data: pages[page++] ?? [], error: null });
      },
    };
    return { qb, calls };
  }

  const mockService = (qb: unknown) =>
    vi.doMock('@/lib/supabase/service', () => ({ createServiceClient: () => qb }));

  it('orders by a TOTAL key before paginating', async () => {
    // Regression for a High finding on PR #1009. `.range()` is OFFSET
    // pagination and Postgres guarantees no order without ORDER BY, so
    // unordered pages can repeat or skip rows — silently mis-stating the
    // ledger. created_at alone is insufficient: a cron fires several calls in
    // the same millisecond and ties can order differently per query.
    vi.resetModules();
    const { qb, calls } = fakeDb([[]]);
    mockService(qb);
    const { fetchAnthropicUsage: fetchIsolated } = await import('./fetchers/anthropic');

    await fetchIsolated({ start: '2026-08-01', end: '2026-08-31' });

    expect(calls.order.map(([col]) => col)).toEqual(['created_at', 'id']);
    expect(calls.order.every(([, o]) => o.ascending)).toBe(true);
  });

  it('aggregates rows sharing an identical created_at exactly once', async () => {
    // Three calls stamped in the same millisecond each count once. This asserts
    // the aggregation side only — the ordering that makes ties deterministic is
    // asserted separately above, and the page-boundary behaviour by the
    // multi-page test below. The original comment here claimed to cover the
    // boundary and did not.
    vi.resetModules();
    const tie = Array.from({ length: 3 }, (_, i) => ({
      request_id: `msg_tie_${i}`,
      task_type: 'coach',
      model_id: 'claude-haiku-4-5-20251001',
      tokens_input: 100,
      tokens_output: 50,
      cost_usd: 0.00035,
      cost_per_input_mtok: 1,
    }));
    const { qb } = fakeDb([tie]);
    mockService(qb);
    const { fetchAnthropicUsage: fetchIsolated } = await import('./fetchers/anthropic');

    const lines = await fetchIsolated({ start: '2026-08-01', end: '2026-08-31' });

    expect(lines).toHaveLength(1);
    expect(lines[0].calls).toBe(3);
    expect(lines[0].inputTokens).toBe(300);
  });

  it('concatenates every page and advances the offset', async () => {
    // Review on PR #1009 correctly noted that no test supplied more than one
    // page, so the `from += PAGE_SIZE` advance and the multi-page concatenation
    // were never executed — the pagination this fetcher exists for was, in
    // effect, untested. A first FULL page forces a second round-trip.
    vi.resetModules();
    let n = 0;
    const mk = () => ({
      request_id: `msg_page_${++n}`,
      task_type: 'coach',
      model_id: 'claude-haiku-4-5-20251001',
      tokens_input: 100,
      tokens_output: 50,
      cost_usd: 0.00035,
      cost_per_input_mtok: 1,
    });
    const { qb, calls } = fakeDb([
      Array.from({ length: 1000 }, mk),
      Array.from({ length: 7 }, mk),
    ]);
    mockService(qb);
    const { fetchAnthropicUsage: fetchIsolated } = await import('./fetchers/anthropic');

    const lines = await fetchIsolated({ start: '2026-08-01', end: '2026-08-31' });

    expect(calls.ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(lines[0].calls).toBe(1007);
    expect(lines[0].inputTokens).toBe(100_700);
  });

  it('stops paginating on a short page rather than looping forever', async () => {
    vi.resetModules();
    const { qb, calls } = fakeDb([[]]);
    mockService(qb);
    const { fetchAnthropicUsage: fetchIsolated } = await import('./fetchers/anthropic');

    await fetchIsolated({ start: '2026-08-01', end: '2026-08-31' });

    expect(calls.ranges).toEqual([[0, 999]]);
  });

  it('queries an end bound that includes the whole final day', async () => {
    // created_at is timestamptz; `<= 'YYYY-MM-DD'` would drop every call made
    // after midnight on the last day of the period.
    vi.resetModules();
    const bounds: string[] = [];
    const { qb } = fakeDb([[]]);
    (qb as Record<string, unknown>).lt = (_c: string, v: string) => {
      bounds.push(v);
      return qb;
    };
    mockService(qb);
    const { fetchAnthropicUsage: fetchIsolated } = await import('./fetchers/anthropic');

    await fetchIsolated({ start: '2026-08-01', end: '2026-08-31' });

    expect(bounds[0]).toBe('2026-09-01T00:00:00.000Z');
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
