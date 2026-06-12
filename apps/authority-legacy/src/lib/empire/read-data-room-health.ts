// Server-only helper that condenses the per-kind FreshnessStrip (#114) into
// a single ok/stale/missing signal for GlobalStatusBar.
//
// Rules:
//   missing → at least one of the 5 expected kinds has no non-superseded doc
//   stale   → no kind missing, but at least one is_stale (>7d since latest)
//   ok      → every kind has a non-stale, non-superseded doc
//
// Bypasses requireAdmin — calling server component must be admin-gated.

import { getAdminClient } from '@/lib/supabase/admin';
import { computeKindFreshness } from '@/lib/data-room/kind-freshness';

export type DataRoomHealth = 'ok' | 'stale' | 'missing';

export interface DataRoomHealthResult {
  health: DataRoomHealth;
  missingKinds: string[];
  staleKinds: string[];
  fetchedAt: string;
}

export async function readDataRoomHealth(): Promise<DataRoomHealthResult | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('data_room_documents')
      .select('id, kind, generated_at, audit_status')
      .order('generated_at', { ascending: false })
      .limit(500);

    if (error) return null;
    const docs = data ?? [];
    const asOf = new Date().toISOString();
    const freshness = computeKindFreshness(docs, asOf);

    const missingKinds = freshness.filter((f) => f.status === 'missing').map((f) => f.kind);
    const staleKinds = freshness.filter((f) => f.is_stale).map((f) => f.kind);

    const health: DataRoomHealth =
      missingKinds.length > 0 ? 'missing' : staleKinds.length > 0 ? 'stale' : 'ok';

    return {
      health,
      missingKinds,
      staleKinds,
      fetchedAt: asOf,
    };
  } catch {
    return null;
  }
}
