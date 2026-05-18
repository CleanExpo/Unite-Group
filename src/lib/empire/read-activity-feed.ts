// Server-only helper that converts the latest agent_actions rows into the
// ActivityDatum shape the ActivityLog component renders. UNI-2024 follow-up.
//
// Mapping:
//   id        — agent_actions.id
//   ts        — created_at
//   agent     — source uppercased (MARGOT, BOARD, PM, ORCHESTRATOR, HERMES, SYSTEM)
//   verb      — action_type lowercased ('dispatched', 'failed', 'completed', ...)
//   target    — idea_text or linear_ticket_id; falls back to action_type
//   severity  — running (in_progress/done) | signal (failed) | hush (else)

import { getAdminClient } from '@/lib/supabase/admin';
import type { ActivityDatum, ActivitySeverity } from '@/components/command-center/activity/activity-data';

export interface ActivityFeedResult {
  events: ActivityDatum[];
  fetchedAt: string;
}

export async function readActivityFeed(limit = 20): Promise<ActivityFeedResult | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, source, action_type, status, idea_text, linear_ticket_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return null;
    const rows = data ?? [];
    const events: ActivityDatum[] = rows
      .filter((row) => typeof row.created_at === 'string')
      .map((row) => {
        const agent = (row.source ?? 'system').toString().toUpperCase();
        const verb = (row.action_type ?? 'event').toString().toLowerCase().replace(/_/g, ' ');
        const target =
          (typeof row.idea_text === 'string' && row.idea_text.trim().length > 0
            ? row.idea_text.trim()
            : null) ??
          row.linear_ticket_id ??
          row.action_type ??
          'unspecified';
        return {
          id: row.id as string,
          ts: row.created_at as string,
          agent,
          verb,
          target,
          severity: severityFor(row.status),
        };
      });

    return {
      events,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function severityFor(status: unknown): ActivitySeverity {
  if (status === 'failed') return 'signal';
  if (status === 'in_progress' || status === 'done') return 'running';
  return 'hush';
}
