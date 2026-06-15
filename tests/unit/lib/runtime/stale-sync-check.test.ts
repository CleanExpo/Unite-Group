/**
 * Stale-sync threshold tests — CRM Coverage Gap #2
 *
 * Verify that integrations are flagged stale when they miss their
 * cadence, error out, or never sync. Results feed the Command Center
 * digest and health ticker.
 */

import { checkStaleSyncs, type SyncStateRow } from '@/lib/runtime/stale-sync-check';

describe('checkStaleSyncs', () => {
  const now = new Date('2026-05-30T12:00:00.000Z');

  it('flags an integration whose next_sync_due_at is past by > cadence', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'linear',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:45:00.000Z',
        next_sync_due_at: '2026-05-30T11:50:00.000Z',
        rows_upserted: 12,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { linear: 5 * 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0].integration).toBe('linear');
    expect(result[0].reason).toBe('missed_cadence');
  });

  it('does NOT flag an integration that is still within its window', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'github',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:55:00.000Z',
        next_sync_due_at: '2026-05-30T12:05:00.000Z',
        rows_upserted: 8,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { github: 10 * 60_000 });
    expect(result).toHaveLength(0);
  });

  it('flags an integration in error state with last sync >1h ago', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'vercel',
        last_sync_status: 'error',
        last_sync_completed_at: '2026-05-30T10:30:00.000Z',
        next_sync_due_at: '2026-05-30T10:35:00.000Z',
        rows_upserted: 0,
        last_sync_error: 'Unauthorized',
      },
    ];
    const result = checkStaleSyncs(rows, now, { vercel: 5 * 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('last_error');
  });

  it('flags an integration error even when the next due timestamp has not passed', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'supabase',
        last_sync_status: 'error',
        last_sync_completed_at: '2026-05-30T11:55:00.000Z',
        next_sync_due_at: '2026-05-30T12:10:00.000Z',
        rows_upserted: 0,
        last_sync_error: 'Sync failed without exposing secrets',
      },
    ];
    const result = checkStaleSyncs(rows, now, { supabase: 15 * 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'supabase',
      reason: 'last_error',
      last_status: 'error',
      minutes_overdue: 0,
      last_error: 'Sync failed without exposing secrets',
    });
  });

  it('flags an integration error even when next_sync_due_at is missing', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'linear',
        last_sync_status: 'error',
        last_sync_completed_at: '2026-05-30T11:59:00.000Z',
        next_sync_due_at: null,
        rows_upserted: 0,
        last_sync_error: 'Worker reported failure',
      },
    ];
    const result = checkStaleSyncs(rows, now, { linear: 10 * 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'linear',
      reason: 'last_error',
      minutes_overdue: 0,
      last_error: 'Worker reported failure',
    });
  });

  it('flags partial sync results with failure details before cadence is missed', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'github',
        last_sync_status: 'partial',
        last_sync_completed_at: '2026-05-30T11:59:00.000Z',
        next_sync_due_at: '2026-05-30T12:10:00.000Z',
        rows_upserted: 7,
        last_sync_error: 'repository_a: rate limited',
      },
    ];

    const result = checkStaleSyncs(rows, now, { github: 15 * 60_000 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'github',
      reason: 'last_error',
      last_status: 'partial',
      minutes_overdue: 0,
      last_error: 'repository_a: rate limited',
    });
  });

  it('clamps malformed next_sync_due_at error rows to zero overdue minutes', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'github',
        last_sync_status: 'error',
        last_sync_completed_at: '2026-05-30T11:59:00.000Z',
        next_sync_due_at: 'not-a-date',
        rows_upserted: 0,
        last_sync_error: 'Worker returned an invalid next sync timestamp',
      },
    ];

    const result = checkStaleSyncs(rows, now, { github: 10 * 60_000 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'github',
      reason: 'last_error',
      minutes_overdue: 0,
      last_error: 'Worker returned an invalid next sync timestamp',
    });
  });

  it('falls back to completed_at plus cadence when next_sync_due_at is malformed on ok rows', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'stripe',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:40:00.000Z',
        next_sync_due_at: 'not-a-date',
        rows_upserted: 12,
        last_sync_error: null,
      },
    ];

    const result = checkStaleSyncs(rows, now, { stripe: 10 * 60_000 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'stripe',
      reason: 'missed_cadence',
      last_status: 'ok',
      minutes_overdue: 10,
      last_error: null,
    });
  });

  it('treats malformed last_sync_completed_at as no usable completed sync', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'linear',
        last_sync_status: 'ok',
        last_sync_completed_at: 'not-a-date',
        next_sync_due_at: null,
        rows_upserted: 7,
        last_sync_error: null,
      },
    ];

    const result = checkStaleSyncs(rows, now, { linear: 5 * 60_000 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      integration: 'linear',
      reason: 'never_synced',
      last_status: 'ok',
      minutes_overdue: 0,
      last_error: null,
    });
  });

  it('flags an integration that has never completed a sync', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'stripe',
        last_sync_status: null,
        last_sync_completed_at: null,
        next_sync_due_at: null,
        rows_upserted: null,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { stripe: 15 * 60_000 });
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('never_synced');
  });

  it('returns empty when all integrations are healthy', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'linear',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:58:00.000Z',
        next_sync_due_at: '2026-05-30T12:03:00.000Z',
        rows_upserted: 12,
        last_sync_error: null,
      },
      {
        integration: 'github',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:55:00.000Z',
        next_sync_due_at: '2026-05-30T12:05:00.000Z',
        rows_upserted: 8,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { linear: 5 * 60_000, github: 10 * 60_000 });
    expect(result).toHaveLength(0);
  });

  it('includes minutes_overdue in stale results', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'railway',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T11:30:00.000Z',
        next_sync_due_at: '2026-05-30T11:35:00.000Z',
        rows_upserted: 4,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { railway: 5 * 60_000 });
    expect(result[0].minutes_overdue).toBe(25);
  });

  it('ignores integrations not present in cadence map', () => {
    const rows: SyncStateRow[] = [
      {
        integration: 'unknown-vendor',
        last_sync_status: 'ok',
        last_sync_completed_at: '2026-05-30T10:00:00.000Z',
        next_sync_due_at: '2026-05-30T10:05:00.000Z',
        rows_upserted: 1,
        last_sync_error: null,
      },
    ];
    const result = checkStaleSyncs(rows, now, { linear: 5 * 60_000 });
    expect(result).toHaveLength(0);
  });
});
