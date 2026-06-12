// Emit an agent_actions row for every DataRoom regeneration run so the
// existing observability surfaces (GlobalStatusBar agentsAlive + alerts,
// ActivityLog feed — both live since #116/#117) light up when the daily
// cron fires. Without this, a silent cron failure produced no signal.
//
// Failure to record is logged but not fatal — the regeneration itself
// already returned its result to the caller; we don't want a missed
// observability write to surface as an HTTP error.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunAllResult } from './run-all-generators';

export interface RecordCronInput {
  supabase: SupabaseClient;
  /** Which entry point fired — 'cron' (daily Vercel cron) or 'admin' (button). */
  trigger: 'cron' | 'admin';
  /** Per-kind generator results returned by runAllGenerators. */
  results: RunAllResult[];
  /** ISO timestamp the regen completed. */
  generatedAt: string;
  /** Authenticated email for admin-triggered runs; null for cron. */
  actorEmail?: string | null;
}

export async function recordRegenerationAction({
  supabase,
  trigger,
  results,
  generatedAt,
  actorEmail = null,
}: RecordCronInput): Promise<void> {
  const failed = results.filter((r) => !r.ok);
  const status = failed.length === 0 ? 'done' : 'failed';
  const action_type =
    trigger === 'cron'
      ? 'data_room_regenerate_cron'
      : 'data_room_regenerate_admin';

  try {
    await supabase.from('agent_actions').insert({
      source: 'system',
      action_type,
      status,
      payload: {
        generated_at: generatedAt,
        kinds_ok: results.filter((r) => r.ok).map((r) => r.kind),
        kinds_failed: failed.map((r) => ({ kind: r.kind, error: r.error })),
        actor_email: actorEmail,
        trigger,
      },
      idea_text:
        failed.length === 0
          ? `DataRoom regenerate OK (${results.length} kinds)`
          : `DataRoom regenerate ${failed.length}/${results.length} failed`,
    });
  } catch (err) {
    // Don't crash the regeneration response on a missed observability write.
    // Surface to server logs so SystemHealthTile's integration health can
    // notice if writes are systematically failing.
    console.error('[data-room/record-cron-action] insert failed', err);
  }
}
