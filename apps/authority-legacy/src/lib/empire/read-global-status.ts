// Server-only helper for GlobalStatusBar (UNI-2024 follow-up).
//
// Inputs: agent_actions rows over the last 24 hours.
//   - agentsAlive   = count of distinct source values among non-failed rows
//   - alerts        = count of rows with status='failed'
//
// Build SHA comes from Vercel's VERCEL_GIT_COMMIT_SHA env (set automatically
// on every deploy); falls back to 'main' when running locally.
//
// Bypasses requireAdmin — calling server component must be admin-gated.

import { getAdminClient } from '@/lib/supabase/admin';

export interface GlobalStatusSummary {
  agentsAlive: number;
  alerts: number;
  buildSha: string;
  fetchedAt: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function readGlobalStatus(): Promise<GlobalStatusSummary | null> {
  try {
    const supabase = getAdminClient();
    const sinceIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

    const { data, error } = await supabase
      .from('agent_actions')
      .select('source, status')
      .gte('created_at', sinceIso)
      .limit(10_000);

    if (error) return null;

    const rows = data ?? [];
    const aliveSources = new Set<string>();
    let alerts = 0;
    for (const row of rows) {
      if (row.status === 'failed') {
        alerts += 1;
        continue;
      }
      if (typeof row.source === 'string' && row.source.length > 0) {
        aliveSources.add(row.source);
      }
    }

    return {
      agentsAlive: aliveSources.size,
      alerts,
      buildSha: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'main').slice(0, 7),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
