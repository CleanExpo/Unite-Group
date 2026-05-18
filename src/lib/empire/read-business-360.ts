// Server-only helper for Business360Grid (UNI-2024 follow-up).
//
// Strategy: keep the existing seed tiles as the structural layer (logo,
// slug, kpiLabel, stateLabel — all stable identity info) and overwrite the
// numeric fields (kpiValue, series, state) from pi_ceo_health_snapshots
// for businesses that have live data. Seed tiles whose pi_ceo_key has no
// snapshots stay as seed — the SourceBadge still flips to `live` because
// at least one tile is real.
//
// Bypasses requireAdmin — calling server component must be admin-gated.

import { getAdminClient } from '@/lib/supabase/admin';
import {
  BUSINESS_360_TILES,
  type Business360Datum,
} from '@/components/command-center/business-360/business-360-data';

export interface Business360Result {
  tiles: Business360Datum[];
  fetchedAt: string;
  liveBusinessCount: number;
}

const SPARKLINE_WINDOW = 14;

export async function readBusiness360(): Promise<Business360Result | null> {
  try {
    const supabase = getAdminClient();
    const sinceIso = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('pi_ceo_health_snapshots')
      .select('project_id, overall_health, snapshot_at')
      .gte('snapshot_at', sinceIso)
      .order('snapshot_at', { ascending: true })
      .limit(10_000);

    if (error) return null;
    const snapshots = data ?? [];

    const byProject = new Map<string, { health: number; at: string }[]>();
    for (const row of snapshots) {
      if (typeof row.overall_health !== 'number') continue;
      if (typeof row.project_id !== 'string') continue;
      const list = byProject.get(row.project_id) ?? [];
      list.push({ health: row.overall_health, at: row.snapshot_at as string });
      byProject.set(row.project_id, list);
    }

    let liveBusinessCount = 0;
    const tiles: Business360Datum[] = BUSINESS_360_TILES.map((seed) => {
      const series = byProject.get(seed.slug) ?? byProject.get(seed.id);
      if (!series || series.length === 0) return seed;
      liveBusinessCount += 1;
      const trail = series.slice(-SPARKLINE_WINDOW).map((p) => p.health);
      const latest = trail[trail.length - 1];
      return {
        ...seed,
        kpiLabel: 'Health',
        kpiValue: latest,
        kpiSuffix: '/100',
        kpiPrefix: undefined,
        series: trail,
        state: latest >= 80 ? 'running' : latest < 60 ? 'signal' : seed.state,
      };
    });

    return {
      tiles,
      fetchedAt: new Date().toISOString(),
      liveBusinessCount,
    };
  } catch {
    return null;
  }
}
