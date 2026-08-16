/**
 * Records one Anthropic call's measured token usage to `public.ai_usage_logs`.
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

export interface RecordUsageInput {
  /** Capability id (router) or route id (direct callers) — the attribution matchKey. */
  taskType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Anthropic response id, when available — dedupes at-least-once writes. */
  requestId?: string | null;
  latencyMs?: number;
  /** Extra context for the ledger (e.g. { business: 'dr' }). */
  metadata?: Record<string, unknown>;
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
    const priced = priceUsage(input);
    if (!priced) {
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

    const { error } = await db.from('ai_usage_logs').insert({
      workspace_id: null, // retired tenancy column — never populated, never queried
      provider: 'anthropic',
      model_id: input.model,
      task_type: input.taskType,
      tokens_input: input.inputTokens,
      tokens_output: input.outputTokens,
      cost_usd: priced?.costUsd ?? 0,
      cost_per_input_mtok: priced?.inputPerMTok ?? null,
      cost_per_output_mtok: priced?.outputPerMTok ?? null,
      request_id: input.requestId ?? null,
      latency_ms: input.latencyMs ?? null,
      success: true,
      metadata: {
        ...(input.metadata ?? {}),
        ...(priced ? {} : { unpriced_model: input.model }),
      },
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
