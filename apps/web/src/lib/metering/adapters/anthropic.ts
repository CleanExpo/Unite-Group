/**
 * Anthropic cost adapter. Pure transform from first-party measured token usage
 * into normalised {@link RawCostEvent}s. No I/O — the aggregation query that
 * produces `AnthropicUsageLine[]` is injected by the fetcher, keeping this
 * unit-testable exactly like the Vercel adapter.
 *
 * UNLIKE the other adapters, the input here is OUR OWN measurement rather than
 * a provider's billing payload. `fetchers/registry.ts` forbids guessing a
 * billing API shape, and this sidesteps that entirely: Anthropic returns exact
 * token counts on every Messages response, so the quantities are observed and
 * only the rates are looked up (see lib/ai/pricing.ts). The consequence worth
 * stating: these amounts are computed, not invoiced, and will diverge from the
 * bill where caching or batch discounts apply.
 *
 * The matchKey is the capability / task id (e.g. 'strategy-daily', 'coach'),
 * which is what attribution.ts maps to a business — the same role a project
 * name plays for Vercel.
 */

import type { CostSourceAdapter, RawCostEvent } from '../types';

/** One period's aggregated usage for a single capability + model pair. */
export interface AnthropicUsageLine {
  /** Capability / task id — the attribution matchKey. */
  taskType: string;
  model: string;
  periodStart: string;
  periodEnd: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  /** Summed from the per-call prices recorded at call time. */
  amountUsd: number;
  /** Calls whose model had no known rate — their tokens are counted, cost is not. */
  unpricedCalls: number;
}

export const anthropicAdapter: CostSourceAdapter<AnthropicUsageLine[]> = {
  id: 'anthropic',
  reachability: 'key-gate',
  nativeCurrency: 'USD',
  toEvents(lines) {
    return lines.map(
      (l): RawCostEvent => ({
        costSourceId: 'anthropic',
        // Deterministic and stable for the period, so re-ingesting the same
        // window upserts rather than duplicates (persist dedupes on
        // cost_source_id + external_id + period_start).
        externalId: `${l.periodStart}:${l.taskType}:${l.model}`,
        periodStart: l.periodStart,
        periodEnd: l.periodEnd,
        amount: l.amountUsd,
        currency: 'USD',
        matchKey: l.taskType,
        raw: {
          model: l.model,
          calls: l.calls,
          inputTokens: l.inputTokens,
          outputTokens: l.outputTokens,
          // Surfaced rather than dropped: a non-zero value here means the
          // amount understates real spend for this line.
          unpricedCalls: l.unpricedCalls,
          measurement: 'first-party-tokens',
        },
      })
    );
  },
};
