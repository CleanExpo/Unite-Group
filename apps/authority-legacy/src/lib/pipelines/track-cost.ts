/**
 * SYN-518: Pipeline Cost Tracker
 * Unified utility for logging AI pipeline costs to Supabase pipeline_cost_ledger table.
 * Writes to structured log first (survives DB failure), then to DB.
 */

import { createClient } from '@supabase/supabase-js';

export interface TrackCostParams {
  pipeline_name: string;
  client_id: string | null; // null for board-level pipelines (video script, cron)
  run_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

// Claude model pricing reference ($ per 1M tokens)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
};

export function calculateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? { input: 3, output: 15 }; // default to sonnet pricing
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export async function trackPipelineCost(params: TrackCostParams): Promise<void> {
  const logEntry = {
    event: 'pipeline_cost',
    timestamp: new Date().toISOString(),
    ...params,
  };

  // Belt-and-suspenders: always write to structured log first
  console.log(JSON.stringify(logEntry));

  // Write to pipeline_cost_ledger table
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('pipeline_cost_ledger')
      .insert({
        pipeline_name: params.pipeline_name,
        client_id: params.client_id,
        run_id: params.run_id,
        model: params.model,
        input_tokens: params.input_tokens,
        output_tokens: params.output_tokens,
        cost_usd: params.cost_usd,
      });

    if (error) {
      console.error(JSON.stringify({
        event: 'pipeline_cost_ledger_write_failed',
        error: error.message,
        ...params,
      }));
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'pipeline_cost_ledger_exception',
      error: String(err),
      ...params,
    }));
  }
}
