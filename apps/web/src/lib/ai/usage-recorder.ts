/**
 * Records one AI call's measured token usage to `public.ai_usage_logs`.
 * Defaults to provider 'anthropic' with a computed price; UNI-2780 callers may
 * attribute the row to another provider / provider account and pass the
 * provider-reported cost.
 *
 * WHY THIS TABLE. `ai_usage_logs` already existed, purpose-built for exactly
 * this (cost_usd, cost_per_input_mtok, cost_per_output_mtok, request_id,
 * task_type, model_id, token columns) and effectively dead — 5 rows, last
 * written 19/11/2025. Adding a fourth ai-usage table beside it would breach the
 * No-Invaders "no duplicate systems" rule, and reusing it needs no migration.
 *
 * `workspace_id` is a retired multi-tenant column. It is NULLABLE and is left
 * NULL here; nothing scopes by it. Writes go through the service client because
 * RLS is enabled on the table and these are system-side records, not
 * founder-initiated rows.
 *
 * FAIL-SOFT BY DESIGN. Metering must never take down an AI call. Every failure
 * path — no client, insert error, unknown model — logs and returns. An
 * unmeasured call is a gap in the ledger; a thrown error is a broken feature,
 * and the second is far worse. The cron that later aggregates this table
 * reports what it finds, so gaps surface rather than hide.
 */

import { priceUsage } from './pricing';

/** Where a usage row came from. Mirrors the ai_usage_logs.source CHECK (UNI-2780). */
export type UsageSource = 'sdk' | 'cli_claude' | 'cli_codex' | 'cli_cursor' | 'swarm' | 'manual';

export interface RecordUsageInput {
  /** Capability id (router) or route id (direct callers) — the attribution matchKey. */
  taskType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Anthropic response id, when available — dedupes at-least-once writes. */
  requestId?: string | null;
  latencyMs?: number;
  /** Cache hits — billed at 0.1x input, reported separately by Anthropic. */
  cacheReadTokens?: number;
  /** Cache writes — billed at 1.25x input for the 5-minute default. */
  cacheWriteTokens?: number;
  /**
   * Defaults to true. Both current callers meter only completed responses, but
   * the column exists to separate successes from failures — a hardcoded true
   * would silently mislabel the first caller that meters a failed call.
   */
  success?: boolean;
  /** Extra context for the ledger (e.g. { business: 'dr' }). */
  metadata?: Record<string, unknown>;

  // ── UNI-2780 subscription metering. All optional; when absent the row is
  // byte-identical to the pre-UNI-2780 shape (no new columns are written), so
  // existing callers keep working against a database without the migration.
  /** Provider label for the row. Default 'anthropic'. */
  provider?: string;
  /** provider_accounts.id this call was billed to (e.g. one specific Claude Max seat). */
  providerAccountId?: string | null;
  founderId?: string | null;
  source?: UsageSource;
  project?: string | null;
  /**
   * Cost the provider itself reported (USD). When present and a finite number
   * >= 0 it wins over the computed price, which only knows Anthropic rates.
   */
  reportedCostUsd?: number | null;
}

/**
 * Insert one usage row. Never throws.
 *
 * An unknown model is still recorded, with `cost_usd` 0 and
 * `metadata.unpriced_model` set, so the token counts survive and the pricing
 * gap is visible in the data rather than silently costed at zero.
 */
export async function recordAiUsage(input: RecordUsageInput): Promise<void> {
  try {
    const provider = input.provider ?? 'anthropic';
    const reported =
      typeof input.reportedCostUsd === 'number' &&
      Number.isFinite(input.reportedCostUsd) &&
      input.reportedCostUsd >= 0
        ? input.reportedCostUsd
        : null;
    if (input.reportedCostUsd != null && reported === null) {
      console.warn(`[ai/usage] ignoring invalid reportedCostUsd for '${input.taskType}'`);
    }
    // pricing.ts holds Anthropic rates only — applying them to another
    // provider's model would fabricate a cost. Non-Anthropic rows are priced
    // only by a reported cost; otherwise they are flagged unpriced.
    const priced = provider === 'anthropic' ? priceUsage(input) : null;
    if (!priced && reported === null) {
      console.warn(
        `[ai/usage] no rate for model '${input.model}' — recording tokens with cost_usd 0 and flagging`,
      );
    }

    // Imported lazily so that test environments and any build-time import of
    // the AI layer do not require Supabase service credentials to be present.
    const { createServiceClient } = await import('@/lib/supabase/service');
    // ai_usage_logs predates the current generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any;

    // workspace_id is deliberately ABSENT, not set to null: the column is
    // nullable, so omitting it produces an identical row while keeping the
    // retired tenancy column out of new code entirely.
    const { error } = await db.from('ai_usage_logs').insert({
      provider,
      model_id: input.model,
      task_type: input.taskType,
      tokens_input: input.inputTokens,
      tokens_output: input.outputTokens,
      tokens_cached: input.cacheReadTokens ?? 0,
      cost_usd: reported ?? priced?.costUsd ?? 0,
      cost_per_input_mtok: priced?.inputPerMTok ?? null,
      cost_per_output_mtok: priced?.outputPerMTok ?? null,
      request_id: input.requestId ?? null,
      latency_ms: input.latencyMs ?? null,
      success: input.success ?? true,
      metadata: {
        ...(input.metadata ?? {}),
        // Raw cache counts kept alongside the priced figure so a later
        // reconciliation against the real invoice can tell a 5-minute write
        // (1.25x) from a 1-hour write (2x), which the priced total assumes away.
        ...(input.cacheReadTokens ? { cache_read_tokens: input.cacheReadTokens } : {}),
        ...(input.cacheWriteTokens ? { cache_write_tokens: input.cacheWriteTokens } : {}),
        ...(reported !== null ? { cost_basis: 'reported' } : {}),
        ...(priced || reported !== null ? {} : { unpriced_model: input.model }),
      },
      // New columns only when supplied (see RecordUsageInput).
      ...(input.providerAccountId != null ? { provider_account_id: input.providerAccountId } : {}),
      ...(input.founderId != null ? { founder_id: input.founderId } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.project != null ? { project: input.project } : {}),
    });

    if (error) {
      console.warn(`[ai/usage] insert failed for '${input.taskType}': ${error.message}`);
    }
  } catch (err) {
    console.warn(
      `[ai/usage] recording skipped for '${input.taskType}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
