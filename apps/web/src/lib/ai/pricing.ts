/**
 * Anthropic token pricing — the single source of truth for per-MTok rates.
 *
 * WHY THIS FILE EXISTS. Until now nothing in this codebase could say what an AI
 * call cost. `cost-tracker.ts` accumulated token counts into a module-level Map
 * that does not survive a serverless invocation, and had no production callers
 * at all. Pricing lived nowhere. Every cost conversation was therefore
 * arithmetic over configuration rather than a measurement.
 *
 * WHY FIRST-PARTY RATES RATHER THAN A BILLING API. Anthropic returns exact
 * `usage.input_tokens` / `usage.output_tokens` on every Messages response — we
 * already receive the quantities. Pricing them here needs no Admin API key and
 * no guess at a billing payload shape, which `fetchers/registry.ts` explicitly
 * forbids. The trade-off is honest and worth stating: this yields a COMPUTED
 * cost from measured tokens, not an invoiced figure. It will diverge from the
 * bill wherever prompt caching, batch discounts, or long-context surcharges
 * apply. Treat it as a well-founded estimate that is finally attributable per
 * capability and per business — something a billing API cannot give us.
 *
 * Verified live 16/08/2026 — https://claude.com/pricing
 * Re-verify when adding a model, and move VERIFIED_ON with it.
 */

/** ISO date the rates below were last checked against the published price list. */
export const RATES_VERIFIED_ON = '2026-08-16';

export interface ModelRate {
  /** USD per million input tokens. */
  inputPerMTok: number;
  /** USD per million output tokens. */
  outputPerMTok: number;
}

/**
 * Family prefix → rate. Matched by longest prefix so a dated variant
 * (`claude-haiku-4-5-20251001`) resolves to its family without needing an entry
 * per snapshot. Order here is irrelevant; specificity is decided at lookup.
 */
export const MODEL_RATES: Record<string, ModelRate> = {
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-fable-5': { inputPerMTok: 10, outputPerMTok: 50 },
};

/**
 * Does `model` name this exact family, or a dated snapshot of it?
 *
 * Accepts `claude-haiku-4-5` and `claude-haiku-4-5-20251001` (the form the repo
 * actually pins), and rejects `claude-haiku-4-5-unreleased`.
 *
 * A bare `startsWith` was the first implementation and it was wrong for the same
 * reason a zero rate is wrong: it prices an UNKNOWN model at a plausible
 * neighbouring rate and never sets the unpriced flag, so the error is invisible.
 * A future non-dated variant will be unpriced until it is added here — that is
 * the intended direction to fail, because unpriced is loud and mispriced is not.
 */
function matchesFamily(model: string, family: string): boolean {
  if (model === family) return true;
  if (!model.startsWith(`${family}-`)) return false;
  return /^\d{8}$/.test(model.slice(family.length + 1));
}

/**
 * Resolve a model id to its rate, preferring the most specific family.
 * Returns null for anything unrecognised — never a zero, and never a
 * neighbouring family's rate.
 */
export function rateForModel(model: string): ModelRate | null {
  let best: { family: string; rate: ModelRate } | null = null;
  for (const [family, rate] of Object.entries(MODEL_RATES)) {
    if (matchesFamily(model, family) && (!best || family.length > best.family.length)) {
      best = { family, rate };
    }
  }
  return best?.rate ?? null;
}

export interface PricedUsage {
  costUsd: number;
  inputPerMTok: number;
  outputPerMTok: number;
}

/**
 * Price a single call's token usage in USD.
 *
 * Returns null for an unknown model rather than 0. A zero would be
 * indistinguishable from a genuinely free call and would understate spend
 * silently — the exact failure this whole phase exists to remove. Callers must
 * record the usage anyway and flag it, so the token counts survive and the
 * pricing gap is visible rather than absorbed.
 */
export function priceUsage(usage: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): PricedUsage | null {
  const rate = rateForModel(usage.model);
  if (!rate) return null;
  const costUsd =
    (usage.inputTokens / 1_000_000) * rate.inputPerMTok +
    (usage.outputTokens / 1_000_000) * rate.outputPerMTok;
  return {
    // 6 dp: a single Haiku call can cost well under a cent, and rounding to
    // cents per call would floor most of the ledger to zero.
    costUsd: Math.round((costUsd + Number.EPSILON) * 1e6) / 1e6,
    inputPerMTok: rate.inputPerMTok,
    outputPerMTok: rate.outputPerMTok,
  };
}
