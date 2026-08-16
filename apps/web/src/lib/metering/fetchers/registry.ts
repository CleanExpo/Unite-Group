/**
 * Cost-fetcher registry. A fetcher pulls a source's READ-ONLY usage for a
 * period and hands it to that source's adapter.
 *
 * Provider fetchers are registered here ONLY once their billing endpoint +
 * response mapping are confirmed against a live call. We never guess a billing
 * API shape — a wrong guess would write dirty data, the exact opposite of the
 * goal. Empty until confirmed; the cron then reports `wired: 0` and does
 * nothing, which is the correct dormant state.
 *
 * To wire a source (e.g. Vercel): implement `fetchVercelUsage(period)` against
 * the confirmed endpoint returning `VercelUsageLine[]`, then add
 * `{ adapter: vercelAdapter, fetch: fetchVercelUsage }` below. DigitalOcean,
 * Stripe (fees), LLM APIs, ElevenLabs, Twilio, and domains follow identically.
 */

import { anthropicAdapter } from '../adapters/anthropic';
import type { CostSourceAdapter } from '../types';

import { fetchAnthropicUsage } from './anthropic';

export interface Period {
  /** ISO date YYYY-MM-DD, inclusive. */
  start: string;
  end: string;
}

export interface CostFetcher<TInput = unknown> {
  adapter: CostSourceAdapter<TInput>;
  /** Read-only usage fetch for the period (connected token / scoped key). */
  fetch(period: Period): Promise<TInput>;
}

export const COST_FETCHERS: CostFetcher[] = [
  // Anthropic is registered without a confirmed billing endpoint, and that is
  // deliberate rather than an exception to the rule above. The rule exists to
  // stop us GUESSING a provider's billing payload; this fetcher guesses
  // nothing. It reads back token counts Anthropic itself returned on each
  // Messages response, which lib/ai/usage-recorder.ts persisted at call time,
  // and prices them from lib/ai/pricing.ts. Quantities are observed; only the
  // published rates are looked up.
  //
  // The honest limitation, carried through to the ledger: the amount is
  // COMPUTED, not invoiced, and will diverge from the bill where prompt
  // caching or batch discounts apply. Reconciling against Anthropic's Admin
  // usage/cost report is a later step and needs an admin key we do not hold.
  { adapter: anthropicAdapter, fetch: fetchAnthropicUsage },
];
