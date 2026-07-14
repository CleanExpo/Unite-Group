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

import type { CostSourceAdapter } from '../types';

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

export const COST_FETCHERS: CostFetcher[] = [];
