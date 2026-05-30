/**
 * Stale-sync checker — CRM Coverage Gap #2
 *
 * Flags integrations that have missed their sync cadence,
 * errored out, or never completed an initial sync.
 */

export interface SyncStateRow {
  integration: string;
  last_sync_status: 'ok' | 'partial' | 'error' | null;
  last_sync_completed_at: string | null;
  next_sync_due_at: string | null;
  rows_upserted: number | null;
  last_sync_error: string | null;
}

export interface StaleSyncResult {
  integration: string;
  reason: 'missed_cadence' | 'last_error' | 'never_synced';
  last_status: string | null;
  minutes_overdue: number;
  last_error: string | null;
}

export function checkStaleSyncs(
  rows: SyncStateRow[],
  now: Date,
  cadenceMap: Record<string, number>, // integration → cadenceMs
): StaleSyncResult[] {
  const stale: StaleSyncResult[] = [];

  for (const row of rows) {
    const cadenceMs = cadenceMap[row.integration];
    if (!cadenceMs) continue; // unknown integration → skip

    // Never synced
    if (!row.last_sync_completed_at) {
      stale.push({
        integration: row.integration,
        reason: 'never_synced',
        last_status: row.last_sync_status,
        minutes_overdue: 0,
        last_error: row.last_sync_error,
      });
      continue;
    }

    const completedAt = new Date(row.last_sync_completed_at).getTime();
    const nextDue = row.next_sync_due_at
      ? new Date(row.next_sync_due_at).getTime()
      : completedAt + cadenceMs;

    const overdueMs = now.getTime() - nextDue;

    if (overdueMs > 0) {
      stale.push({
        integration: row.integration,
        reason: row.last_sync_status === 'error' ? 'last_error' : 'missed_cadence',
        last_status: row.last_sync_status,
        minutes_overdue: Math.max(0, Math.floor(overdueMs / 60_000)),
        last_error: row.last_sync_error,
      });
    }
  }

  return stale;
}
